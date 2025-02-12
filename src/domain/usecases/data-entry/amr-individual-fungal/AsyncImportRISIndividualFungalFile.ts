import _ from "lodash";
import { Maybe } from "../../../../utils/ts-utils";
import { Country } from "../../../entities/Country";
import { Future, FutureData } from "../../../entities/Future";
import { GlassModule } from "../../../entities/GlassModule";
import { Id } from "../../../entities/Ref";
import {
    getDefaultErrorImportSummary,
    getDefaultErrorImportSummaryWithEventIdList,
    ImportSummary,
    ImportSummaryWithEventIdList,
    MergedImportSummaryWithEventIdList,
} from "../../../entities/data-entry/ImportSummary";
import { CustomDataColumns } from "../../../entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { RISIndividualFungalDataRepository } from "../../../repositories/data-entry/RISIndividualFungalDataRepository";
import { ProgramRulesMetadataRepository } from "../../../repositories/program-rules/ProgramRulesMetadataRepository";
import { mapToImportSummary } from "../ImportBLTemplateEventProgram";
import { mapIndividualFungalDataItemsToEntities, runCustomValidations, runProgramRuleValidations } from "./common";
import { TrackerTrackedEntity } from "../../../entities/TrackedEntityInstance";

const AMR_INDIVIDUAL_PROGRAM_ID = "mMAj6Gofe49";
const AMR_DATA_PROGRAM_STAGE_ID = "KCmWZD8qoAk";
const AMR_FUNGAL_PROGRAM_STAGE_ID = "ysGSonDq9Bc";
const CREATE_AND_UPDATE = "CREATE_AND_UPDATE";
const TRACKED_ENTITY_IMPORT_SUMMARY_TYPE = "trackedEntity";

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

        return this.repositories.risIndividualFungalRepository
            .getFromBlob(dataColumns, inputBlob)
            .flatMap(risIndividualFungalDataItems => {
                return runCustomValidations(risIndividualFungalDataItems, countryCode, period).flatMap(
                    validationSummary => {
                        //If there are blocking errors on custom validation, do not import. Return immediately.
                        if (validationSummary.blockingErrors.length > 0) {
                            return this.saveAllImportSummaries(uploadId, [validationSummary]);
                        } else {
                            //Import RIS data
                            const programId = program ? program.id : AMR_INDIVIDUAL_PROGRAM_ID;

                            const programStageId =
                                program?.programStageId ?? glassModule.name === "AMR - Individual"
                                    ? AMR_DATA_PROGRAM_STAGE_ID
                                    : AMR_FUNGAL_PROGRAM_STAGE_ID;

                            return mapIndividualFungalDataItemsToEntities(
                                risIndividualFungalDataItems,
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
                                        const errorSummaries: ImportSummary[] = [
                                            getDefaultErrorImportSummary({
                                                nonBlockingErrors: validationResult.nonBlockingErrors,
                                                blockingErrors: validationResult.blockingErrors,
                                            }),
                                        ];
                                        return this.saveAllImportSummaries(uploadId, errorSummaries);
                                    } else {
                                        const trackedEntities =
                                            validationResult.teis && validationResult.teis.length > 0
                                                ? validationResult.teis
                                                : [];

                                        return this.importTrackedEntitiesInChunks(
                                            trackedEntities,
                                            uploadChunkSize,
                                            glassModule.name
                                        ).flatMap(importSummariesWithMergedEventIdList => {
                                            if (importSummariesWithMergedEventIdList.mergedEventIdList.length > 0) {
                                                return this.uploadIdListFileAndSave(
                                                    uploadId,
                                                    importSummariesWithMergedEventIdList.mergedEventIdList,
                                                    glassModule.name
                                                ).flatMap(() => {
                                                    return this.saveAllImportSummaries(
                                                        uploadId,
                                                        importSummariesWithMergedEventIdList.allImportSummaries
                                                    );
                                                });
                                            } else {
                                                return this.saveAllImportSummaries(
                                                    uploadId,
                                                    importSummariesWithMergedEventIdList.allImportSummaries
                                                );
                                            }
                                        });
                                    }
                                });
                            });
                        }
                    }
                );
            });
    }

    private importTrackedEntitiesInChunks(
        trackedEntities: TrackerTrackedEntity[],
        uploadChunkSize: number,
        glassModuleName: string
    ): FutureData<{
        allImportSummaries: ImportSummary[];
        mergedEventIdList: Id[];
    }> {
        const chunkedTrackedEntities = _(trackedEntities).chunk(uploadChunkSize).value();

        const $saveTrackedEntities = chunkedTrackedEntities.map(trackedEntitiesChunk => {
            return this.repositories.trackerRepository
                .import({ trackedEntities: trackedEntitiesChunk }, CREATE_AND_UPDATE)
                .mapError(error => {
                    console.error(`[${new Date().toISOString()}] Error importing RIS Individual File values: ${error}`);
                    const errorImportSummary: ImportSummaryWithEventIdList =
                        getDefaultErrorImportSummaryWithEventIdList({
                            blockingErrors: [{ error: error, count: 1 }],
                        });

                    return errorImportSummary;
                })
                .flatMap(response => {
                    return mapToImportSummary(
                        response,
                        TRACKED_ENTITY_IMPORT_SUMMARY_TYPE,
                        this.repositories.metadataRepository
                    )
                        .mapError(error => {
                            console.error(
                                `[${new Date().toISOString()}] Error importing RIS Individual File values: ${error}`
                            );

                            const errorImportSummary: ImportSummaryWithEventIdList =
                                getDefaultErrorImportSummaryWithEventIdList({
                                    blockingErrors: [{ error: error, count: 1 }],
                                });

                            return errorImportSummary;
                        })
                        .flatMap(
                            (
                                importSummaryResult
                            ): Future<ImportSummaryWithEventIdList, ImportSummaryWithEventIdList> => {
                                const hasErrorStatus = importSummaryResult.importSummary.status === "ERROR";
                                if (hasErrorStatus) {
                                    return Future.error(importSummaryResult);
                                } else {
                                    return Future.success(importSummaryResult);
                                }
                            }
                        );
                });
        });

        return Future.sequentialWithAccumulation($saveTrackedEntities, {
            stopOnError: true,
        })
            .flatMap(result => {
                if (result.type === "error") {
                    const errorImportSummary = result.error;
                    const messageErrors = errorImportSummary.importSummary.blockingErrors
                        .map(error => error.error)
                        .join(", ");

                    console.error(
                        `[${new Date().toISOString()}] Error importing some tracked entities from file in module: ${glassModuleName}: ${messageErrors}`
                    );

                    const accumulatedImportSummaries = result.data;
                    const importSummariesWithMergedEventIdListWithErrorSummary = this.mergeImportSummaries([
                        ...accumulatedImportSummaries,
                        errorImportSummary,
                    ]);
                    return Future.success(importSummariesWithMergedEventIdListWithErrorSummary);
                } else {
                    const importSummariesWithMergedEventIdList = this.mergeImportSummaries(result.data);
                    return Future.success(importSummariesWithMergedEventIdList);
                }
            })
            .mapError(() => "Internal error");
    }

    private mergeImportSummaries(importSummaries: ImportSummaryWithEventIdList[]): MergedImportSummaryWithEventIdList {
        const importSummariesWithMergedEventIdList = importSummaries.reduce(
            (
                acc: {
                    allImportSummaries: ImportSummary[];
                    mergedEventIdList: Id[];
                },
                data: {
                    importSummary: ImportSummary;
                    eventIdList: Id[];
                }
            ) => {
                const { importSummary } = data;
                return {
                    allImportSummaries: [...acc.allImportSummaries, importSummary],
                    mergedEventIdList: [...acc.mergedEventIdList, ...data.eventIdList],
                };
            },
            {
                allImportSummaries: [],
                mergedEventIdList: [],
            }
        );

        return importSummariesWithMergedEventIdList;
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
