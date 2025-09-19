import _ from "lodash";
import {
    ImportSummary,
    ImportSummaryWithEventIdList,
    getDefaultErrorImportSummaryWithEventIdList,
    mergeImportSummaries,
} from "../../../entities/data-entry/ImportSummary";
import { FutureData, Future } from "../../../entities/Future";
import { DEFAULT_ASYNC_UPLOAD_DELETE_CHUNK_SIZE } from "../../../entities/GlassModule";
import { Id } from "../../../entities/Ref";
import { TrackerTrackedEntity } from "../../../entities/TrackedEntityInstance";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { mapToImportSummary } from "../ImportBLTemplateEventProgram";

const TRACKED_ENTITY_IMPORT_SUMMARY_TYPE = "trackedEntity";

export function importOrDeleteTrackedEntitiesInChunks(parmas: {
    trackedEntities: TrackerTrackedEntity[];
    chunkSize?: number;
    glassModuleName: string;
    action: "CREATE_AND_UPDATE" | "DELETE";
    trackerRepository: TrackerRepository;
    metadataRepository: MetadataRepository;
}): FutureData<{
    allImportSummaries: ImportSummary[];
    mergedEventIdList: Id[];
}> {
    const {
        trackedEntities,
        chunkSize = DEFAULT_ASYNC_UPLOAD_DELETE_CHUNK_SIZE,
        glassModuleName,
        action,
        trackerRepository,
        metadataRepository,
    } = parmas;
    const chunkedTrackedEntities = _(trackedEntities).chunk(chunkSize).value();

    const $importTrackedEntities = chunkedTrackedEntities.map((trackedEntitiesChunk, index) => {
        console.debug(
            `[${new Date().toISOString()}] Chunk ${index + 1}/${
                chunkedTrackedEntities.length
            } of tracked entities to ${action} for module ${glassModuleName}.`
        );

        return trackerRepository
            .import({ trackedEntities: trackedEntitiesChunk }, action)
            .mapError(error => {
                console.error(
                    `[${new Date().toISOString()}] Error importing tracked entities from file in module ${glassModuleName} with action ${action}: ${error}`
                );
                const errorImportSummary: ImportSummaryWithEventIdList = getDefaultErrorImportSummaryWithEventIdList({
                    blockingErrors: [{ error: error, count: 1 }],
                });

                return errorImportSummary;
            })
            .flatMap(response => {
                console.debug(
                    `[${new Date().toISOString()}] End of chunk ${index + 1}/${
                        chunkedTrackedEntities.length
                    } of tracked entities to ${action} for module ${glassModuleName}.`
                );
                return mapToImportSummary(response, TRACKED_ENTITY_IMPORT_SUMMARY_TYPE, metadataRepository)
                    .mapError(error => {
                        console.error(
                            `[${new Date().toISOString()}] Error importing tracked entities from file in module ${glassModuleName} with action ${action}: ${error}`
                        );

                        const errorImportSummary: ImportSummaryWithEventIdList =
                            getDefaultErrorImportSummaryWithEventIdList({
                                blockingErrors: [{ error: error, count: 1 }],
                            });

                        return errorImportSummary;
                    })
                    .flatMap(
                        (importSummaryResult): Future<ImportSummaryWithEventIdList, ImportSummaryWithEventIdList> => {
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

    return Future.sequentialWithAccumulation($importTrackedEntities, {
        stopOnError: true,
    })
        .flatMap(result => {
            if (result.type === "error") {
                const errorImportSummary = result.error;
                const messageErrors = errorImportSummary.importSummary.blockingErrors
                    .map(error => error.error)
                    .join(", ");

                console.error(
                    `[${new Date().toISOString()}] Error importing some tracked entities from file in module ${glassModuleName} with action ${action}: ${messageErrors}`
                );

                const accumulatedImportSummaries = result.data;
                const importSummariesWithMergedEventIdListWithErrorSummary = mergeImportSummaries([
                    ...accumulatedImportSummaries,
                    errorImportSummary,
                ]);
                return Future.success(importSummariesWithMergedEventIdListWithErrorSummary);
            } else {
                console.debug(
                    `[${new Date().toISOString()}] SUCCESS - All chunks of tracked entities to ${action} for module ${glassModuleName} processed.`
                );
                const importSummariesWithMergedEventIdList = mergeImportSummaries(result.data);
                return Future.success(importSummariesWithMergedEventIdList);
            }
        })
        .mapError(() => "Internal error");
}
