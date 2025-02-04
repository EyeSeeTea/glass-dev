import { D2ValidationResponse } from "../../../../data/repositories/MetadataDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { DataValuesRepository } from "../../../repositories/data-entry/DataValuesRepository";
import { checkBatchId } from "../utils/checkBatchId";
import { checkCountry } from "../utils/checkCountry";
import { checkDhis2Validations } from "../utils/checkDhis2Validations";
import { checkYear } from "../utils/checkYear";
import {
    AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID,
    getCategoryOptionComboByDataElement,
    getCategoryOptionComboByOptionCodes,
} from "../utils/getCategoryOptionCombo";
import { includeBlockingErrors } from "../utils/includeBlockingErrors";
import { mapDataValuesToImportSummary } from "../utils/mapDhis2Summary";
import { SampleDataRepository } from "../../../repositories/data-entry/SampleDataRepository";
import { SampleData } from "../../../entities/data-entry/amr-external/SampleData";
import { checkDuplicateRowsSAMPLE } from "../utils/checkDuplicateRows";

export const AMR_AMR_DS_Input_files_Sample_DS_ID = "OcAB7oaC072";
export const AMR_BATCHID_CC_ID = "rEMx3WFeLcU";

export class ImportSampleFile {
    constructor(
        private sampleDataRepository: SampleDataRepository,
        private metadataRepository: MetadataRepository,
        private dataValuesRepository: DataValuesRepository
    ) {}

    // NOTICE: check also DeleteSampleDatasetUseCase.ts that contains same code adapted for node environment (only DELETE)
    public import(
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
                const blockingCategoryOptionErrors: { error: string; line: number }[] = [];
                const duplicateRowErrors = checkDuplicateRowsSAMPLE(risDataItems);

                const dataValues = risDataItems
                    .map((risData, index) => {
                        return dataSet.dataElements.map(dataElement => {
                            const dataSetCategoryOptionValues = dataSet_CC.categories.map(category =>
                                risData[category.code as keyof SampleData].toString()
                            );

                            const { categoryOptionComboId: attributeOptionCombo, error: aocBlockingError } =
                                getCategoryOptionComboByOptionCodes(dataSet_CC, dataSetCategoryOptionValues);

                            if (aocBlockingError !== "")
                                blockingCategoryOptionErrors.push({ error: aocBlockingError, line: index + 1 });

                            const { categoryOptionComboId: categoryOptionCombo, error: ccoBlockingError } =
                                getCategoryOptionComboByDataElement(dataElement, dataElement_CC, risData);

                            if (ccoBlockingError !== "")
                                blockingCategoryOptionErrors.push({ error: ccoBlockingError, line: index + 1 });

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

                const blockingCategoryOptionConsistencyErrors: ConsistencyError[] = _(
                    blockingCategoryOptionErrors.map(error => {
                        return { error: error.error, count: 1, lines: [error.line] };
                    })
                )
                    .uniqBy("error")
                    .value();

                const allBlockingErrors =
                    action === "DELETE" //If delete, ignore consistency checks
                        ? []
                        : [
                              ...blockingCategoryOptionConsistencyErrors,
                              ...batchIdErrors,
                              ...yearErrors,
                              ...countryErrors,
                              ...duplicateRowErrors,
                          ];

                if (allBlockingErrors.length > 0) {
                    const errorImportSummary: ImportSummary = {
                        status: "ERROR",
                        importCount: {
                            imported: 0,
                            updated: 0,
                            ignored: 0,
                            deleted: 0,
                            total: 0,
                        },
                        nonBlockingErrors: [],
                        blockingErrors: allBlockingErrors,
                    };

                    return Future.success(errorImportSummary);
                }

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

                                    const importSummary = mapDataValuesToImportSummary(saveSummary, action);

                                    const blockingErrorWithDHISValidation =
                                        action === "DELETE" //If delete, ignore consistency checks
                                            ? []
                                            : [...allBlockingErrors, ...dhis2ValidationErrors];

                                    const summaryWithConsistencyBlokingErrors = includeBlockingErrors(
                                        importSummary,
                                        blockingErrorWithDHISValidation
                                    );

                                    return summaryWithConsistencyBlokingErrors;
                                });
                        });
                });
            });
    }
}
