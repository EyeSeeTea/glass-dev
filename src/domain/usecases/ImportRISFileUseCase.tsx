import { UseCase } from "../../CompositionRoot";
import { Future, FutureData } from "../entities/Future";
import { RISDataRepository } from "../repositories/DataRISRepository";
import { RISData } from "../entities/data-entry/RISData";
import { CategoryCombo } from "../entities/metadata/CategoryCombo";
import { DataValuesSaveSummary } from "../entities/data-entry/DataValuesSaveSummary";
import { MetadataRepository } from "../repositories/MetadataRepository";
import { DataValuesRepository } from "../repositories/DataValuesRepository";
import _ from "lodash";

const AMR_AMR_DS_INPUT_FILES_RIS_DS_ID = "CeQPmXgrhHF";
const AMR_PATHOGEN_ANTIBIOTIC_CC_ID = "S427AvQESbw";
const AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID = "OwKsZQnHCJu";
const defaultCategoryCombo = "bjDvmb4bfuf";

export class ImportRISFileUseCase implements UseCase {
    constructor(
        private risDataRepository: RISDataRepository,
        private metadataRepository: MetadataRepository,
        private dataValuesRepository: DataValuesRepository
    ) {}

    public execute(inputFile: File): FutureData<DataValuesSaveSummary> {
        return this.risDataRepository
            .get(inputFile)
            .flatMap(risDataItems => {
                return Future.joinObj({
                    risDataItems: Future.success(risDataItems),
                    dataSet: this.metadataRepository.getDataSet(AMR_AMR_DS_INPUT_FILES_RIS_DS_ID),
                    dataSet_CC: this.metadataRepository.getCategoryCombination(AMR_PATHOGEN_ANTIBIOTIC_CC_ID),
                    dataElement_CC: this.metadataRepository.getCategoryCombination(
                        AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID
                    ),
                    orgUnits: this.metadataRepository.getOrgUnitsByCode([
                        ...new Set(risDataItems.map(item => item.COUNTRY)),
                    ]),
                });
            })
            .flatMap(({ risDataItems, dataSet, dataSet_CC, dataElement_CC, orgUnits }) => {
                const dataValues = risDataItems
                    .map(risData => {
                        return dataSet.dataElements.map(dataElement => {
                            const dataSetCategoryOptionValues = dataSet_CC.categories.map(category =>
                                risData[category.code as keyof RISData].toString()
                            );

                            const attributeOptionCombo = this.getCategoryOptionCombo(
                                dataSet_CC,
                                dataSetCategoryOptionValues
                            );

                            const categoryOptionCombo =
                                dataElement.categoryCombo.id === defaultCategoryCombo
                                    ? undefined
                                    : this.getCategoryOptionCombo(dataElement_CC, [
                                          risData.SPECIMEN,
                                          risData.GENDER.replace("UNK", "UNKG"),
                                          risData.ORIGIN.replace("UNK", "UNKO"),
                                          risData.AGEGROUP.replace("UNK", "UNKA"),
                                      ]);
                            const value = risData[dataElement.code as keyof RISData]?.toString() || "";

                            const dataValue = {
                                orgUnit: orgUnits.find(ou => ou.code === risData.COUNTRY)?.id || "",
                                period: risData.YEAR.toString(),
                                attributeOptionCombo: attributeOptionCombo,
                                dataElement: dataElement.id,
                                categoryOptionCombo: categoryOptionCombo,
                                value,
                            };

                            return dataValue;
                        });
                    })
                    .flat();

                /* eslint-disable no-console */
                console.log({ risFileDataValues: dataValues });

                return this.dataValuesRepository.save(dataValues);
            });
    }

    private getCategoryOptionCombo(categoryCombo: CategoryCombo, codes: string[]) {
        const categoryOptions = categoryCombo.categories
            .map(cat => cat.categoryOptions)
            .flat()
            .filter(catOp => codes.includes(catOp.code));

        const uniqueCategoryOptions = _.unionBy(categoryOptions, catOption => catOption.code);

        if (uniqueCategoryOptions.length !== codes.length) {
            /* eslint-disable no-console */
            console.log(
                `All codes not found as category combination in categoryCombo ${
                    categoryCombo.name
                }. codes: ${codes.join(",")}`
            );

            //console.log({ categoryCombo });
            // debugger;
            // throw new Error(`All codes not found as category options. codes: ${codes.join(",")}`);
        }

        //TODO: this is a code brought from old repository written by sneha, improve it without to use let
        //The categoryOptionComboId will be common between both category options.

        let commonCategoryOptionCombos = uniqueCategoryOptions[0]?.categoryOptionCombos;
        uniqueCategoryOptions.map(co => {
            return (commonCategoryOptionCombos = co.categoryOptionCombos.filter(co =>
                commonCategoryOptionCombos?.some(c => c === co)
            ));
        });

        if (commonCategoryOptionCombos?.length === 1) {
            return commonCategoryOptionCombos[0];
        } else return "";
    }
}
