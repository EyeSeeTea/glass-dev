import { UseCase } from "../../../CompositionRoot";
import { Future, FutureData } from "../../entities/Future";
import { DataValuesSaveSummary } from "../../entities/data-entry/DataValuesSaveSummary";
import { MetadataRepository } from "../../repositories/MetadataRepository";
import { DataValuesRepository } from "../../repositories/data-entry/DataValuesRepository";
import {
    AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID,
    getCategoryOptionComboByDataElement,
    getCategoryOptionComboByOptionCodes,
} from "./utils/utils";
import { RISData } from "../../entities/data-entry/external/RISData";
import { RISDataRepository } from "../../repositories/data-entry/RISDataRepository";
import { DataValue } from "../../entities/data-entry/DataValue";
import i18n from "../../../locales";

const AMR_AMR_DS_INPUT_FILES_RIS_DS_ID = "CeQPmXgrhHF";
const AMR_PATHOGEN_ANTIBIOTIC_CC_ID = "S427AvQESbw";

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

                            const attributeOptionCombo = getCategoryOptionComboByOptionCodes(
                                dataSet_CC,
                                dataSetCategoryOptionValues
                            );

                            const categoryOptionCombo = getCategoryOptionComboByDataElement(
                                dataElement,
                                dataElement_CC,
                                risData
                            );

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

                const finalDataValues = dataValues.filter((dv: DataValue) => dv.attributeOptionCombo !== "");

                console.log({ risInitialFileDataValues: dataValues });
                console.log({ risFinalFileDataValues: finalDataValues });

                return this.dataValuesRepository.save(finalDataValues).map(result => {
                    const dataValuesRemovedByEmptyAttOpCom = {
                        object: "",
                        value: i18n.t(
                            `Removed ${
                                dataValues.length - finalDataValues.length
                            } dataValues to import because attributeOptionCombo not found`
                        ),
                    };

                    const removedDataValues = finalDataValues.length !== dataValues.length;

                    const conflicts = removedDataValues
                        ? [...(result.conflicts || []), dataValuesRemovedByEmptyAttOpCom]
                        : result.conflicts;

                    const status = result.status === "SUCCESS" && removedDataValues ? "WARNING" : result.status;

                    return { ...result, status, conflicts };
                });
            });
    }
}