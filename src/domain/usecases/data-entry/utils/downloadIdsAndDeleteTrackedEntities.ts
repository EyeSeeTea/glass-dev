import { Future, FutureData } from "../../../entities/Future";
import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ImportSummary, joinAllImportSummaries } from "../../../entities/data-entry/ImportSummary";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { getStringFromFile, getStringFromFileBlob } from "./fileToString";
import { mapToImportSummary } from "../ImportBLTemplateEventProgram";
import { Id } from "../../../entities/Ref";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { GlassUploads } from "../../../entities/GlassUploads";
import { TrackerTrackedEntity } from "../../../entities/TrackedEntityInstance";
import { Maybe } from "../../../../utils/ts-utils";
import { importOrDeleteTrackedEntitiesInChunks } from "./importOrDeleteTrackedEntitiesInChunks";
import consoleLogger from "../../../../utils/consoleLogger";

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

export const downloadIdsAndDeleteTrackedEntitiesUsingFileBlob = (
    upload: GlassUploads,
    glassModuleName: string,
    programId: Id,
    action: ImportStrategy,
    trackedEntityType: string,
    asyncDeleteChunkSize: Maybe<number>,
    repositories: {
        glassDocumentsRepository: GlassDocumentsRepository;
        trackerRepository: TrackerRepository;
        metadataRepository: MetadataRepository;
        glassUploadsRepository: GlassUploadsRepository;
    }
): FutureData<ImportSummary> => {
    const { id: uploadId, orgUnit: orgUnitId, eventListFileId } = upload;
    if (eventListFileId && !upload.eventListDataDeleted) {
        consoleLogger.debug(`Download document with id ${eventListFileId} to delete tracked entities`);
        return repositories.glassDocumentsRepository.download(eventListFileId).flatMap(fileBlob => {
            return getStringFromFileBlob(fileBlob).flatMap(_trackedEntities => {
                const trackedEntitiesIdList: Id[] = JSON.parse(_trackedEntities);
                consoleLogger.debug(
                    `Retrieved ${trackedEntitiesIdList.length} tracked entities to delete for upload ${uploadId}`
                );
                return repositories.trackerRepository
                    .getExistingTrackedEntitiesIdsByIds(trackedEntitiesIdList, programId)
                    .flatMap(existingTrackedEntitiesIds => {
                        consoleLogger.debug(
                            `Found existing tracked entities: ${existingTrackedEntitiesIds.length} to delete for upload ${uploadId}`
                        );
                        if (existingTrackedEntitiesIds.length === 0) {
                            consoleLogger.debug(`No existing tracked entities found to delete for upload ${uploadId}`);
                            return repositories.glassUploadsRepository.setEventListDataDeleted(uploadId).flatMap(() => {
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

                        if (!asyncDeleteChunkSize) {
                            consoleLogger.debug(
                                `Deleting all tracked entities in a single request for upload ${uploadId}`
                            );
                            return repositories.trackerRepository
                                .import({ trackedEntities: trackedEntities }, action)
                                .flatMap(response => {
                                    return mapToImportSummary(
                                        response,
                                        "trackedEntity",
                                        repositories.metadataRepository
                                    ).flatMap(({ importSummary }) => {
                                        if (importSummary.status === "SUCCESS") {
                                            consoleLogger.debug(
                                                `Successfully deleted all tracked entities for upload ${uploadId}`
                                            );
                                            return repositories.glassUploadsRepository
                                                .setEventListDataDeleted(uploadId)
                                                .flatMap(() => {
                                                    return Future.success(importSummary);
                                                });
                                        } else {
                                            consoleLogger.error(
                                                `Errors occurred while deleting tracked entities for upload ${uploadId}`
                                            );
                                            return Future.success(importSummary);
                                        }
                                    });
                                });
                        } else {
                            return deleteTrackedEntitiesInChunks(
                                uploadId,
                                trackedEntities,
                                glassModuleName,
                                asyncDeleteChunkSize,
                                repositories
                            );
                        }
                    });
            });
        });
    } else {
        consoleLogger.debug(`No enrollments were created during import, so no events to delete.`);

        return repositories.glassUploadsRepository.setEventListDataDeleted(uploadId).flatMap(() => {
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

function deleteTrackedEntitiesInChunks(
    uploadId: Id,
    trackedEntities: TrackerTrackedEntity[],
    glassModuleName: string,
    uploadChunkSize: number,
    repositories: {
        glassUploadsRepository: GlassUploadsRepository;
        trackerRepository: TrackerRepository;
        metadataRepository: MetadataRepository;
    }
): FutureData<ImportSummary> {
    consoleLogger.debug(`Deleting tracked entities in chunks of ${uploadChunkSize} for upload ${uploadId}`);

    return importOrDeleteTrackedEntitiesInChunks({
        trackedEntities: trackedEntities,
        chunkSize: uploadChunkSize,
        glassModuleName: glassModuleName,
        action: "DELETE",
        trackerRepository: repositories.trackerRepository,
        metadataRepository: repositories.metadataRepository,
    }).flatMap(({ allImportSummaries }) => {
        const importSummary = joinAllImportSummaries(allImportSummaries);
        if (importSummary.status === "SUCCESS") {
            return repositories.glassUploadsRepository.setEventListDataDeleted(uploadId).flatMap(() => {
                return Future.success(importSummary);
            });
        } else {
            return Future.success(importSummary);
        }
    });
}
