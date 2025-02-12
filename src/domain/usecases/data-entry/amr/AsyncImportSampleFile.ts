import _ from "lodash";
import { Future, FutureData } from "../../../entities/Future";
import {
    ConsistencyError,
    getDefaultErrorImportSummary,
    ImportSummary,
} from "../../../entities/data-entry/ImportSummary";
import { SampleDataRepository } from "../../../repositories/data-entry/SampleDataRepository";
import { Id } from "../../../entities/Ref";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { DataValuesRepository } from "../../../repositories/data-entry/DataValuesRepository";
import {
    AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID,
    getCategoryOptionComboByDataElement,
    getCategoryOptionComboByOptionCodes,
} from "../utils/getCategoryOptionCombo";
import { SampleData } from "../../../entities/data-entry/amr-external/SampleData";
import { checkBatchId } from "../utils/checkBatchId";
import { checkCountry } from "../utils/checkCountry";
import { checkDhis2Validations } from "../utils/checkDhis2Validations";
import { checkDuplicateRowsSAMPLE } from "../utils/checkDuplicateRows";
import { checkYear } from "../utils/checkYear";
import { includeBlockingErrors } from "../utils/includeBlockingErrors";
import { mapDataValuesToImportSummary } from "../utils/mapDhis2Summary";
import { DataValue } from "../../../entities/data-entry/DataValue";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import {
    DataValuesSaveSummary,
    getDefaultErrorDataValuesSaveSummary,
} from "../../../entities/data-entry/DataValuesSaveSummary";

const AMR_AMR_DS_Input_files_Sample_ID = "OcAB7oaC072";
const AMR_BATCHID_CC_ID = "rEMx3WFeLcU";
const CREATE_AND_UPDATE = "CREATE_AND_UPDATE";

export class AsyncImportSampleFile {
    constructor(
        private repositories: {
            sampleDataRepository: SampleDataRepository;
            metadataRepository: MetadataRepository;
            dataValuesRepository: DataValuesRepository;
            glassUploadsRepository: GlassUploadsRepository;
        }
    ) {}

    public import(params: {
        uploadId: Id;
        inputBlob: Blob;
        batchId: string;
        uploadChunkSize: number;
        period: string;
        orgUnitId: Id;
        countryCode: string;
        dryRun: boolean;
    }): FutureData<ImportSummary[]> {
        const { uploadId, inputBlob, batchId, uploadChunkSize, period, orgUnitId, countryCode, dryRun } = params;
        return this.repositories.sampleDataRepository.getFromBlob(inputBlob).flatMap(risDataItems => {
            return Future.joinObj({
                risDataItems: Future.success(risDataItems),
                dataSet: this.repositories.metadataRepository.getDataSet(AMR_AMR_DS_Input_files_Sample_ID),
                dataSet_CC: this.repositories.metadataRepository.getCategoryCombination(AMR_BATCHID_CC_ID),
                dataElement_CC: this.repositories.metadataRepository.getCategoryCombination(
                    AMR_SPECIMEN_GENDER_AGE_ORIGIN_CC_ID
                ),
                orgUnits: this.repositories.metadataRepository.getOrgUnitsByCode([
                    ...new Set(risDataItems.map(item => item.COUNTRY)),
                ]),
            }).flatMap(({ risDataItems, dataSet, dataSet_CC, dataElement_CC, orgUnits }) => {
                const batchIdErrors = checkBatchId(risDataItems, batchId);
                const yearErrors = checkYear(risDataItems, period);
                const countryErrors = checkCountry(risDataItems, countryCode);
                const blockingCategoryOptionErrors: { error: string; line: number }[] = [];
                const duplicateRowErrors = checkDuplicateRowsSAMPLE(risDataItems);

                const dataValues: DataValue[] = risDataItems
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

                const allBlockingErrors = [
                    ...blockingCategoryOptionConsistencyErrors,
                    ...batchIdErrors,
                    ...yearErrors,
                    ...countryErrors,
                    ...duplicateRowErrors,
                ];

                if (allBlockingErrors.length > 0) {
                    const errorImportSummary: ImportSummary = getDefaultErrorImportSummary({
                        blockingErrors: allBlockingErrors,
                    });

                    return this.saveAllImportSummaries(uploadId, [errorImportSummary]);
                } else {
                    const chunkedDataValues = _(dataValues).chunk(uploadChunkSize).value();

                    const uniqueAttributeOptionCombos = _.uniq(dataValues.map(el => el.attributeOptionCombo || ""));

                    return this.saveDataValuesByChunks(chunkedDataValues, dryRun).flatMap(importSummaries => {
                        return this.getDataSetDHIS2ValidationErrors(
                            AMR_AMR_DS_Input_files_Sample_ID,
                            period.toString(),
                            orgUnitId,
                            uniqueAttributeOptionCombos
                        ).flatMap(dhis2ValidationErrors => {
                            const blockingErrorWithDHISValidation = [...allBlockingErrors, ...dhis2ValidationErrors];

                            const importSummariesWithConsistencyBlokingErrors = importSummaries.map(importSummary =>
                                includeBlockingErrors(importSummary, blockingErrorWithDHISValidation)
                            );

                            return this.saveAllImportSummaries(uploadId, importSummariesWithConsistencyBlokingErrors);
                        });
                    });
                }
            });
        });
    }

    private saveDataValuesByChunks(chunkedDataValues: DataValue[][], dryRun: boolean): FutureData<ImportSummary[]> {
        const $saveDataValuesFutures = chunkedDataValues.map(dataValuesChunk => {
            return this.repositories.dataValuesRepository
                .save(dataValuesChunk, CREATE_AND_UPDATE, dryRun)
                .mapError(error => {
                    console.error(
                        `[${new Date().toISOString()}] Error importing Individual Sample File data values: ${error}`
                    );
                    const dataValuesSaveSummaryError: DataValuesSaveSummary =
                        getDefaultErrorDataValuesSaveSummary(error);

                    const importSummaryError = mapDataValuesToImportSummary(
                        dataValuesSaveSummaryError,
                        CREATE_AND_UPDATE
                    );
                    return importSummaryError;
                })
                .flatMap((dataValuesSaveSummary): Future<ImportSummary, ImportSummary> => {
                    const importSummary = mapDataValuesToImportSummary(dataValuesSaveSummary, CREATE_AND_UPDATE);
                    const hasErrorStatus = importSummary.status === "ERROR";
                    if (hasErrorStatus) {
                        return Future.error(importSummary);
                    } else {
                        return Future.success(importSummary);
                    }
                });
        });

        return Future.sequentialWithAccumulation($saveDataValuesFutures, {
            stopOnError: true,
        })
            .flatMap(result => {
                if (result.type === "error") {
                    const errorImportSummary = result.error;
                    const messageErrors = errorImportSummary.blockingErrors.map(error => error.error).join(", ");

                    console.error(
                        `[${new Date().toISOString()}] Error importing Individual Sample File data values: ${messageErrors}`
                    );
                    const accumulatedImportSummaries = result.data;
                    return Future.success([...accumulatedImportSummaries, errorImportSummary]);
                } else {
                    return Future.success(result.data);
                }
            })
            .mapError(() => "Internal error");
    }

    private getDataSetDHIS2ValidationErrors(
        dataSetId: Id,
        period: string,
        orgUnitId: Id,
        uniqueAttributeOptionCombos: Id[]
    ): FutureData<ConsistencyError[]> {
        return this.repositories.metadataRepository
            .getValidationsDataSet(dataSetId, period, orgUnitId, uniqueAttributeOptionCombos)
            .flatMap(validations => {
                const validationRulesIds: string[] = validations.flatMap(({ validationRuleViolations }) =>
                    validationRuleViolations.map(ruleViolation => ruleViolation?.validationRule?.id)
                );

                return this.repositories.metadataRepository
                    .getValidationRuleInstructions(validationRulesIds)
                    .flatMap(rulesInstructions => {
                        const dhis2ValidationErrors = checkDhis2Validations(validations, rulesInstructions);

                        return Future.success(dhis2ValidationErrors);
                    });
            });
    }

    private saveAllImportSummaries(uploadId: Id, importSummaries: ImportSummary[]): FutureData<ImportSummary[]> {
        return this.repositories.glassUploadsRepository
            .saveImportSummaries({
                uploadId: uploadId,
                importSummaries: importSummaries,
            })
            .flatMap(() => {
                return Future.success(importSummaries);
            });
    }
}
