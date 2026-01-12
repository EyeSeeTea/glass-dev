import { Future, FutureData } from "../../../entities/Future";
import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { getStringFromFile, getStringFromFileBlob } from "./fileToString";
import { mapToImportSummary } from "../ImportBLTemplateEventProgram";
import { Id } from "../../../entities/Ref";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { GlassUploads } from "../../../entities/GlassUploads";
import { TrackerTrackedEntity, TrackerEnrollment, TrackerTrackedEntityAttribute } from "../../../entities/TrackedEntityInstance";

export const downloadIdsAndDeleteTrackedEntities = (
    eventListId: string | undefined,
    orgUnitId: string,
    action: ImportStrategy,
    trackedEntityType: string,
    glassDocumentsRepository: GlassDocumentsRepository,
    trackerRepository: TrackerRepository,
    metadataRepository: MetadataRepository
): FutureData<ImportSummary> => {
    if (eventListId) {
        return glassDocumentsRepository.download(eventListId).flatMap(file => {
            return Future.fromPromise(getStringFromFile(file)).flatMap(_enrollments => {
                const enrollmemtIdList: [] = JSON.parse(_enrollments);
                const trackedEntities = enrollmemtIdList.map(id => {
                    const trackedEntity: TrackerTrackedEntity = {
                        orgUnit: orgUnitId,
                        trackedEntity: id,
                        trackedEntityType: trackedEntityType,
                        attributes: [],
                        enrollments: [],
                    };
                    return trackedEntity;
                });
                return trackerRepository.import({ trackedEntities: trackedEntities }, action).flatMap(response => {
                    return mapToImportSummary(response, "trackedEntity", metadataRepository).flatMap(
                        ({ importSummary }) => {
                            return Future.success(importSummary);
                        }
                    );
                });
            });
        });
    } else {
        //No enrollments were created during import, so no events to delete.
        const summary: ImportSummary = {
            status: "SUCCESS",
            importCount: {
                ignored: 0,
                imported: 0,
                deleted: 0,
                updated: 0,
                total: 0,
            },
            nonBlockingErrors: [],
            blockingErrors: [],
        };
        return Future.success(summary);
    }
};
/*
export const downloadIdsAndDeleteTrackedEntitiesUsingFileBlob = (
    upload: GlassUploads,
    programId: Id,
    action: ImportStrategy,
    trackedEntityType: string,
    glassDocumentsRepository: GlassDocumentsRepository,
    trackerRepository: TrackerRepository,
    metadataRepository: MetadataRepository,
    glassUploadsRepository: GlassUploadsRepository
): FutureData<ImportSummary> => {
    const { id: uploadId, orgUnit: orgUnitId, eventListFileId } = upload;
    if (eventListFileId && !upload.eventListDataDeleted) {
        console.log("downloadIdsAndDeleteTrackedEntitiesUsingFileBlob");
        console.log("eventListFileId: ", eventListFileId);
        console.log()
        return glassDocumentsRepository.download(eventListFileId).flatMap(fileBlob => {
            console.log(fileBlob);
            return getStringFromFileBlob(fileBlob).flatMap(_trackedEntities => {
                const trackedEntitiesIdList: Id[] = JSON.parse(_trackedEntities);
                console.log(_trackedEntities);
                return trackerRepository
                    .getExistingTrackedEntitiesIdsByIds(trackedEntitiesIdList, programId)
                    .flatMap(existingTrackedEntitiesIds => {
                        if (existingTrackedEntitiesIds.length === 0) {
                            return glassUploadsRepository.setEventListDataDeleted(uploadId).flatMap(() => {
                                const summary: ImportSummary = {
                                    status: "SUCCESS",
                                    importCount: {
                                        ignored: 0,
                                        imported: 0,
                                        deleted: 0,
                                        updated: 0,
                                        total: 0,
                                    },
                                    nonBlockingErrors: [],
                                    blockingErrors: [],
                                };
                                return Future.success(summary);
                            });
                        }

                        const trackedEntities = existingTrackedEntitiesIds.map(id => {
                            const trackedEntity: TrackerTrackedEntity = {
                                orgUnit: orgUnitId,
                                trackedEntity: id,
                                trackedEntityType: trackedEntityType,
                                attributes: [],
                                enrollments: [],
                            };
                            return trackedEntity;
                        });
                        console.log("trackedEntities: ")
                        console.log(trackedEntities);
                        return trackerRepository
                            .import({ trackedEntities: trackedEntities }, action)
                            .flatMap(response => {
                                return mapToImportSummary(response, "trackedEntity", metadataRepository).flatMap(
                                    ({ importSummary }) => {
                                        if (importSummary.status === "SUCCESS") {
                                            return glassUploadsRepository
                                                .setEventListDataDeleted(uploadId)
                                                .flatMap(() => {
                                                    return Future.success(importSummary);
                                                });
                                        } else {
                                            return Future.success(importSummary);
                                        }
                                    }
                                );
                            });
                    });
            });
        });
    } else {
        //No enrollments were created during import, so no events to delete.
        return glassUploadsRepository.setEventListDataDeleted(uploadId).flatMap(() => {
            const summary: ImportSummary = {
                status: "SUCCESS",
                importCount: {
                    ignored: 0,
                    imported: 0,
                    deleted: 0,
                    updated: 0,
                    total: 0,
                },
                nonBlockingErrors: [],
                blockingErrors: [],
            };
            return Future.success(summary);
        });
    }
};
*/

export const downloadIdsAndDeleteTrackedEntitiesUsingFileBlob = (
    upload: GlassUploads,
    programId: Id,
    action: ImportStrategy,
    trackedEntityType: string,
    glassDocumentsRepository: GlassDocumentsRepository,
    trackerRepository: TrackerRepository,
    metadataRepository: MetadataRepository,
    glassUploadsRepository: GlassUploadsRepository
): FutureData<ImportSummary> => {
    const { id: uploadId, orgUnit: orgUnitId, eventListFileId } = upload;

    const processEventListFile = async (): Promise<ImportSummary> => {
        console.log("Processing event list file...");
        console.log("eventListFileId:", eventListFileId);

        try {
            let fileBlob;
            try {
                fileBlob = await glassDocumentsRepository.download(eventListFileId ?? "").toPromise();
            } catch (error) {
                if (error instanceof Error) {
                    console.error("Error downloading file with id:", eventListFileId, error);
                    if (error.message.includes("fetch failed")) {
                        throw new Error(
                            `Network error: Failed to download file with id ${eventListFileId}. Please check your internet connection and try again.`
                        );
                    } else {
                        throw new Error(`Failed to download file with id ${eventListFileId}: ${error.message}`);
                    }
                } else {
                    console.error("Unknown error downloading file with id:", eventListFileId, error);
                    throw new Error(`Failed to download file with id ${eventListFileId}: Unknown error`);
                }
            }

            // Parse the tracked entities data
            const trackedEntitiesData = await getStringFromFileBlob(fileBlob).toPromise();
            const trackedEntitiesIdList: Id[] = JSON.parse(trackedEntitiesData);
            console.log("Tracked entities ID list:", trackedEntitiesIdList);

            // Fetch existing tracked entities
            const existingTrackedEntitiesIds = await trackerRepository
                .getExistingTrackedEntitiesIdsByIds(trackedEntitiesIdList, programId)
                .toPromise();
            //console.log("Existing tracked entities count:", existingTrackedEntitiesIds.length);

            // If no existing tracked entities, mark data as deleted and return success
            if (existingTrackedEntitiesIds.length === 0) {
                return await markDataAsDeletedAndReturnSuccess(uploadId, glassUploadsRepository);
            }

            // Prepare tracked entities for import
            const trackedEntities = existingTrackedEntitiesIds.map(id => ({
                orgUnit: orgUnitId,
                trackedEntity: id,
                trackedEntityType: trackedEntityType,
                attributes: [],
                enrollments: [],
            }));
            //console.log("Prepared tracked entities for import:", trackedEntities);

            // Import the tracked entities
            const response = await trackerRepository.import({ trackedEntities }, action).toPromise();
            const { importSummary } = await mapToImportSummary(
                response,
                "trackedEntity",
                metadataRepository
            ).toPromise();

            // If import is successful, mark data as deleted
            if (importSummary.status === "SUCCESS") {
                await glassUploadsRepository.setEventListDataDeleted(uploadId);
            }

            return importSummary;
        } catch (error) {
            console.error("Error processing event list file:", error);
            throw error;
        }
    };

    const noEventListToProcess = async (): Promise<ImportSummary> => {
        return await markDataAsDeletedAndReturnSuccess(uploadId, glassUploadsRepository);
    };

    if (eventListFileId && !upload.eventListDataDeleted) {
        return Future.fromPromise(processEventListFile());
    } else {
        return Future.fromPromise(noEventListToProcess());
    }
};

// Helper function to mark data as deleted and return a success summary
const markDataAsDeletedAndReturnSuccess = async (
    uploadId: Id,
    glassUploadsRepository: GlassUploadsRepository
): Promise<ImportSummary> => {
    await glassUploadsRepository.setEventListDataDeleted(uploadId);

    return {
        status: "SUCCESS",
        importCount: {
            ignored: 0,
            imported: 0,
            deleted: 0,
            updated: 0,
            total: 0,
        },
        nonBlockingErrors: [],
        blockingErrors: [],
    };
};
