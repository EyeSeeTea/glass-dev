import { UseCase } from "../../../CompositionRoot";
import { Future, FutureData } from "../../entities/Future";
import { MetadataRepository } from "../../repositories/MetadataRepository";
import { DataValuesRepository } from "../../repositories/data-entry/DataValuesRepository";
import {
    AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID,
    getCategoryOptionComboByDataElement,
    getCategoryOptionComboByOptionCodes,
} from "./utils/getCategoryOptionCombo";
import { SampleData } from "../../entities/data-entry/external/SampleData";
import { SampleDataRepository } from "../../repositories/data-entry/SampleDataRepository";
import { ImportSummary } from "../../entities/data-entry/ImportSummary";
import { mapToImportSummary } from "./utils/mapDhis2Summary";
import { checkBatchId } from "./utils/checkBatchId";
import { includeBlokingErrors } from "./utils/includeBlockingErrors";
import { checkYear } from "./utils/checkYear";
import { ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";
import { D2ValidationResponse } from "../../../data/repositories/MetadataDefaultRepository";
import { checkDhis2Validations } from "./utils/checkDhis2Validations";
import { checkCountry } from "./utils/checkCountry";

const AMR_AMR_DS_Input_files_Sample_DS_ID = "OcAB7oaC072";
const AMR_BATCHID_CC_ID = "rEMx3WFeLcU";

export class ImportSampleFileUseCase implements UseCase {
    constructor(
        private sampleDataRepository: SampleDataRepository,
        private metadataRepository: MetadataRepository,
        private dataValuesRepository: DataValuesRepository
    ) {}

    public execute(
        inputFile: File,
        batchId: string,
        year: string,
        action: ImportStrategy,
        orgUnit: string,
        countryCode: string,
        dryRun: boolean
    ): FutureData<ImportSummary> {
        return this.sampleDataRepository
            .get(inputFile)
            .flatMap(risDataItems => {
                return Future.joinObj({
                    risDataItems: Future.success(risDataItems),
                    dataSet: this.metadataRepository.getDataSet(AMR_AMR_DS_Input_files_Sample_DS_ID),
                    dataSet_CC: this.metadataRepository.getCategoryCombination(AMR_BATCHID_CC_ID),
                    dataElement_CC: this.metadataRepository.getCategoryCombination(
                        AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID
                    ),
                    orgUnits: this.metadataRepository.getOrgUnitsByCode([
                        ...new Set(risDataItems.map(item => item.COUNTRY)),
                    ]),
                });
            })
            .flatMap(({ risDataItems, dataSet, dataSet_CC, dataElement_CC, orgUnits }) => {
                const batchIdErrors = checkBatchId(risDataItems, batchId);
                const yearErrors = checkYear(risDataItems, year);
                const countryErrors = checkCountry(risDataItems, countryCode);

                const dataValues = risDataItems
                    .map(risData => {
                        return dataSet.dataElements.map(dataElement => {
                            const dataSetCategoryOptionValues = dataSet_CC.categories.map(category =>
                                risData[category.code as keyof SampleData].toString()
                            );

                            const { categoryOptionComboId: attributeOptionCombo } = getCategoryOptionComboByOptionCodes(
                                dataSet_CC,
                                dataSetCategoryOptionValues
                            );

                            const categoryOptionCombo = getCategoryOptionComboByDataElement(
                                dataElement,
                                dataElement_CC,
                                risData
                            );
                            const value = risData[dataElement.code as keyof SampleData]?.toString() || "";

                            const dataValue = {
                                orgUnit: orgUnits.find(ou => ou.code === risData.COUNTRY)?.id || "",
                                period: risData.YEAR.toString(),
                                attributeOptionCombo,
                                dataElement: dataElement.id,
                                categoryOptionCombo: categoryOptionCombo,
                                value,
                            };

                            return dataValue;
                        });
                    })
                    .flat();

                /* eslint-disable no-console */
                console.log({ sampleFileDataValues: dataValues });

                const uniqueAOCs = _.uniq(dataValues.map(el => el.attributeOptionCombo || ""));

                return this.dataValuesRepository.save(dataValues, action, dryRun).flatMap(saveSummary => {
                    return this.metadataRepository
                        .validateDataSet(AMR_AMR_DS_Input_files_Sample_DS_ID, year.toString(), orgUnit, uniqueAOCs)
                        .flatMap(validationResponse => {
                            const validations = validationResponse as D2ValidationResponse[];

                            const validationRulesIds: string[] = validations.flatMap(({ validationRuleViolations }) =>
                                validationRuleViolations.map(
                                    ruleViolation => (ruleViolation as any)?.validationRule?.id
                                )
                            );

                            return this.metadataRepository
                                .getValidationRuleInstructions(validationRulesIds)
                                .map(rulesInstructions => {
                                    const dhis2ValidationErrors = checkDhis2Validations(validations, rulesInstructions);

                                    const importSummary = mapToImportSummary(saveSummary);

                                    const summaryWithConsistencyBlokingErrors = includeBlokingErrors(importSummary, [
                                        ...batchIdErrors,
                                        ...yearErrors,
                                        ...countryErrors,
                                        ...dhis2ValidationErrors,
                                    ]);

                                    return summaryWithConsistencyBlokingErrors;
                                });
                        });
                });
            });
    }
}
