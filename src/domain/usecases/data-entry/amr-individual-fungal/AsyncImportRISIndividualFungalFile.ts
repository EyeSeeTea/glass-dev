import { Maybe } from "../../../../utils/ts-utils";
import { Country } from "../../../entities/Country";
import { Future, FutureData } from "../../../entities/Future";
import { GlassModule } from "../../../entities/GlassModule";
import { Id } from "../../../entities/Ref";
import { getDefaultErrorImportSummary, ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { CustomDataColumns } from "../../../entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { RISIndividualFungalDataRepository } from "../../../repositories/data-entry/RISIndividualFungalDataRepository";
import { ProgramRulesMetadataRepository } from "../../../repositories/program-rules/ProgramRulesMetadataRepository";
import { mapIndividualFungalDataItemsToEntities, runCustomValidations, runProgramRuleValidations } from "./common";
import { importOrDeleteTrackedEntitiesInChunks } from "../utils/importOrDeleteTrackedEntitiesInChunks";
import consoleLogger from "../../../../utils/consoleLogger";

const AMR_INDIVIDUAL_PROGRAM_ID = "mMAj6Gofe49";
const AMR_DATA_PROGRAM_STAGE_ID = "KCmWZD8qoAk";
const AMR_FUNGAL_PROGRAM_STAGE_ID = "ysGSonDq9Bc";
const CREATE_AND_UPDATE = "CREATE_AND_UPDATE";

const FILE_CHUNK_SIZE = 5000;

export class AsyncImportRISIndividualFungalFile {
    constructor(
        private repositories: {
            risIndividualFungalRepository: RISIndividualFungalDataRepository;
            trackerRepository: TrackerRepository;
            programRulesMetadataRepository: ProgramRulesMetadataRepository;
            glassDocumentsRepository: GlassDocumentsRepository;
            glassUploadsRepository: GlassUploadsRepository;
            metadataRepository: MetadataRepository;
        }
    ) {}

    public asyncImportRISIndividualFungalFile(params: {
        uploadId: Id;
        inputBlob: Blob;
        glassModule: GlassModule;
        uploadChunkSize: number;
        orgUnitId: Id;
        countryCode: string;
        period: string;
        program: Maybe<{
            id: Id;
            programStageId: string;
        }>;
        dataColumns: CustomDataColumns;
        allCountries: Country[];
    }): FutureData<ImportSummary[]> {
        const {
            uploadId,
            inputBlob,
            glassModule,
            uploadChunkSize,
            orgUnitId,
            countryCode,
            period,
            program,
            dataColumns,
            allCountries,
        } = params;

        const programId = program ? program.id : AMR_INDIVIDUAL_PROGRAM_ID;
        const programStageId =
            program?.programStageId ?? glassModule.name === "AMR - Individual"
                ? AMR_DATA_PROGRAM_STAGE_ID
                : AMR_FUNGAL_PROGRAM_STAGE_ID;

        let totalRowsValidated = 0;
        let validationErrorSummary: ImportSummary | undefined = undefined;

        // First pass: Validate all chunks
        consoleLogger.debug(`Starting validation pass for upload ${uploadId}`);
        return this.repositories.risIndividualFungalRepository
            .getFromBlobInChunks(dataColumns, inputBlob, FILE_CHUNK_SIZE, chunkOfCustomDataColumns => {
                // If we already encountered blocking errors, stop validation
                if (validationErrorSummary) {
                    return Future.success(false);
                }

                // +2 because file lines start at 1, and we have a header row in the file
                const fileLineStart = totalRowsValidated + 2;

                totalRowsValidated += chunkOfCustomDataColumns.length;

                return runCustomValidations(chunkOfCustomDataColumns, countryCode, period, fileLineStart).flatMap(
                    validationSummary => {
                        if (validationSummary.blockingErrors.length > 0) {
                            consoleLogger.debug(
                                `Blocking errors found during custom validation of chunk in upload ${uploadId} for module ${glassModule.name}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}`
                            );
                            validationErrorSummary = validationSummary;
                            return Future.success(false);
                        }
                        consoleLogger.debug(
                            `Custom validation passed for chunk of ${chunkOfCustomDataColumns.length} rows in upload ${uploadId} for module ${glassModule.name}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}`
                        );

                        return mapIndividualFungalDataItemsToEntities(
                            chunkOfCustomDataColumns,
                            orgUnitId,
                            programId,
                            programStageId,
                            countryCode,
                            period,
                            allCountries,
                            this.repositories.trackerRepository
                        ).flatMap(entities => {
                            return runProgramRuleValidations(
                                programId,
                                entities,
                                programStageId,
                                this.repositories.programRulesMetadataRepository
                            ).flatMap(validationResult => {
                                if (validationResult.blockingErrors.length > 0) {
                                    consoleLogger.debug(
                                        `Blocking errors found during program rule validation of chunk in upload ${uploadId} for module ${glassModule.name}, programId ${programId}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}`
                                    );

                                    const errorSummary = getDefaultErrorImportSummary({
                                        nonBlockingErrors: validationResult.nonBlockingErrors,
                                        blockingErrors: validationResult.blockingErrors,
                                    });
                                    validationErrorSummary = errorSummary;
                                    return Future.success(false);
                                }
                                consoleLogger.debug(
                                    `Program rule validation passed for chunk of ${chunkOfCustomDataColumns.length} rows in upload ${uploadId} for module ${glassModule.name}, programId ${programId}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}`
                                );
                                return Future.success(true);
                            });
                        });
                    }
                );
            })
            .flatMap(() => {
                // After validation pass, check if there were errors
                if (validationErrorSummary) {
                    consoleLogger.debug(
                        `Validation failed for upload ${uploadId}. Total rows validated: ${totalRowsValidated}. Saving error report.`
                    );
                    return this.saveAllImportSummaries(uploadId, [validationErrorSummary]);
                }

                consoleLogger.debug(
                    `Validation passed for upload ${uploadId}. Total rows validated: ${totalRowsValidated}. Starting import pass.`
                );

                // Second pass: Import all chunks (validation already passed)
                let totalRowsImported = 0;
                let allImportSummaries: ImportSummary[] = [];
                let allEventIdList: Id[] = [];

                return this.repositories.risIndividualFungalRepository
                    .getFromBlobInChunks(dataColumns, inputBlob, FILE_CHUNK_SIZE, chunkOfCustomDataColumns => {
                        totalRowsImported += chunkOfCustomDataColumns.length;
                        return mapIndividualFungalDataItemsToEntities(
                            chunkOfCustomDataColumns,
                            orgUnitId,
                            programId,
                            programStageId,
                            countryCode,
                            period,
                            allCountries,
                            this.repositories.trackerRepository
                        ).flatMap(entities => {
                            return importOrDeleteTrackedEntitiesInChunks({
                                trackedEntities: entities,
                                chunkSize: uploadChunkSize,
                                glassModuleName: glassModule.name,
                                action: CREATE_AND_UPDATE,
                                trackerRepository: this.repositories.trackerRepository,
                                metadataRepository: this.repositories.metadataRepository,
                                async: false,
                            })
                                .flatMap(importSummariesWithMergedEventIdList => {
                                    allImportSummaries = [
                                        ...allImportSummaries,
                                        ...importSummariesWithMergedEventIdList.allImportSummaries,
                                    ];
                                    allEventIdList = [
                                        ...allEventIdList,
                                        ...importSummariesWithMergedEventIdList.mergedEventIdList,
                                    ];
                                    if (importSummariesWithMergedEventIdList.mergedEventIdList.length > 0) {
                                        consoleLogger.debug(
                                            `${importSummariesWithMergedEventIdList.mergedEventIdList.length} Tracked entity IDs imported from chunk of ${uploadId} for module ${glassModule.name}, programId ${programId}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}`
                                        );
                                    }
                                    consoleLogger.debug(
                                        `Chunk imported successfully in upload ${uploadId} for module ${glassModule.name}, programId ${programId}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}`
                                    );
                                    return Future.success(true);
                                })
                                .flatMapError(error => {
                                    // If import fails, log error and add error summary
                                    // TODO: check this behavior is correct
                                    consoleLogger.error(
                                        `Error importing chunk in upload ${uploadId}: ${error}. Stopping import.`
                                    );
                                    const errorSummary: ImportSummary = getDefaultErrorImportSummary({
                                        blockingErrors: [
                                            {
                                                error: `Import failed: ${error}`,
                                                count: 1,
                                                lines: [],
                                            },
                                        ],
                                        nonBlockingErrors: [],
                                    });
                                    allImportSummaries = [...allImportSummaries, errorSummary];
                                    return Future.success(false);
                                });
                        });
                    })
                    .flatMap(() => {
                        consoleLogger.debug(
                            `Import completed for upload ${uploadId}. Total rows imported: ${totalRowsImported}, Total event IDs: ${allEventIdList.length}`
                        );
                        if (allEventIdList.length > 0) {
                            return this.uploadIdListFileAndSave(uploadId, allEventIdList, glassModule.name).flatMap(
                                () => {
                                    return this.saveAllImportSummaries(uploadId, allImportSummaries);
                                }
                            );
                        } else {
                            consoleLogger.debug(
                                `No Tracked entity IDs imported from ${uploadId} for module ${glassModule.name}, programId ${programId}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}`
                            );
                            return this.saveAllImportSummaries(uploadId, allImportSummaries);
                        }
                    });
            });
    }

    private uploadIdListFileAndSave(uploadId: Id, eventIdList: Id[], moduleName: string): FutureData<void> {
        //Events that were imported successfully: create and uplaod a file with event ids
        // and associate it with the upload datastore object
        const jsonData = JSON.stringify(eventIdList);
        const eventListBuffer = Buffer.from(jsonData, "utf-8");
        return this.repositories.glassDocumentsRepository
            .saveBuffer(eventListBuffer, `${uploadId}_eventIdsFile`, moduleName)
            .flatMap(fileId => {
                return this.repositories.glassUploadsRepository.setEventListFileId(uploadId, fileId);
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
