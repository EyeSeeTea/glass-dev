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
                consoleLogger.debug(
                    `${risIndividualFungalDataItems.length} rows read from file of upload ${uploadId} for module ${glassModule.name}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}`
                );
                //Run custom validations
                return runCustomValidations(risIndividualFungalDataItems, countryCode, period).flatMap(
                    validationSummary => {
                        //If there are blocking errors on custom validation, do not import. Return immediately.
                        if (validationSummary.blockingErrors.length > 0) {
                            consoleLogger.debug(
                                `Blocking errors found during custom validation of ${uploadId} for module ${glassModule.name}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}`
                            );
                            return this.saveAllImportSummaries(uploadId, [validationSummary]);
                        } else {
                            consoleLogger.debug(
                                `No blocking errors found during custom validation of ${uploadId} for module ${glassModule.name}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}.`
                            );
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
                                consoleLogger.debug(
                                    `${entities.length} Tracked entity instances mapped from of ${uploadId} for module ${glassModule.name}, programId ${programId}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}`
                                );
                                //Run program rule validations
                                return runProgramRuleValidations(
                                    programId,
                                    entities,
                                    programStageId,
                                    this.repositories.programRulesMetadataRepository
                                ).flatMap(validationResult => {
                                    if (validationResult.blockingErrors.length > 0) {
                                        consoleLogger.debug(
                                            `Blocking errors found during program rule validation of ${uploadId} for module ${glassModule.name}, programId ${programId}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}`
                                        );

                                        const errorSummaries: ImportSummary[] = [
                                            getDefaultErrorImportSummary({
                                                nonBlockingErrors: validationResult.nonBlockingErrors,
                                                blockingErrors: validationResult.blockingErrors,
                                            }),
                                        ];
                                        return this.saveAllImportSummaries(uploadId, errorSummaries);
                                    } else {
                                        consoleLogger.debug(
                                            `No blocking errors found during program rule validation of ${uploadId} for module ${glassModule.name}, programId ${programId}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}. Proceeding with import...`
                                        );
                                        const trackedEntities =
                                            validationResult.teis && validationResult.teis.length > 0
                                                ? validationResult.teis
                                                : [];

                                        return importOrDeleteTrackedEntitiesInChunks({
                                            trackedEntities: trackedEntities,
                                            chunkSize: uploadChunkSize,
                                            glassModuleName: glassModule.name,
                                            action: CREATE_AND_UPDATE,
                                            trackerRepository: this.repositories.trackerRepository,
                                            metadataRepository: this.repositories.metadataRepository,
                                        }).flatMap(importSummariesWithMergedEventIdList => {
                                            if (importSummariesWithMergedEventIdList.mergedEventIdList.length > 0) {
                                                consoleLogger.debug(
                                                    `${importSummariesWithMergedEventIdList.mergedEventIdList.length} Tracked entity IDs imported from ${uploadId} for module ${glassModule.name}, programId ${programId}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}`
                                                );
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
                                                consoleLogger.debug(
                                                    `No Tracked entity IDs imported from ${uploadId} for module ${glassModule.name}, programId ${programId}, orgUnitId ${orgUnitId}, countryCode ${countryCode}, period ${period}`
                                                );
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
