import _ from "lodash";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";

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
import consoleLogger from "../../../../utils/consoleLogger";

const TRACKED_ENTITY_IMPORT_SUMMARY_TYPE = "trackedEntity";

export function importOrDeleteTrackedEntitiesInChunks(params: {
    trackedEntities: TrackerTrackedEntity[];
    chunkSize?: number;
    glassModuleName: string;
    action: "CREATE_AND_UPDATE" | "DELETE";
    trackerRepository: TrackerRepository;
    metadataRepository: MetadataRepository;
    async?: boolean;
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
        async = false,
    } = params;
    consoleLogger.debug(`Starting ${action} ${trackedEntities.length} tracked entities in chunks of ${chunkSize}.`);
    const chunkedTrackedEntities = _(trackedEntities).chunk(chunkSize).value();

    const $importTrackedEntities = chunkedTrackedEntities.map((trackedEntitiesChunk, index) => {
        consoleLogger.debug(
            `Chunk ${index + 1}/${
                chunkedTrackedEntities.length
            } of tracked entities to ${action} for module ${glassModuleName}.`
        );

        const chunkStartTime = Date.now();

        return importTrackedEntities(trackedEntitiesChunk, {
            trackerRepository,
            action,
            async,
        })
            .mapError(error => {
                const elapsedMs = Date.now() - chunkStartTime;
                consoleLogger.info(
                    `Chunk ${index + 1}/${chunkedTrackedEntities.length} (${
                        trackedEntitiesChunk.length
                    } entities) in ${elapsedMs} ms`
                );

                consoleLogger.error(
                    `Error importing tracked entities from file in module ${glassModuleName} with action ${action}: ${error}`
                );
                const errorImportSummary: ImportSummaryWithEventIdList = getDefaultErrorImportSummaryWithEventIdList({
                    blockingErrors: [{ error: error, count: 1 }],
                });

                return errorImportSummary;
            })
            .flatMap(response => {
                const elapsedMs = Date.now() - chunkStartTime;
                consoleLogger.debug(
                    `Chunk ${index + 1}/${chunkedTrackedEntities.length} (${
                        trackedEntitiesChunk.length
                    } entities) in ${elapsedMs} ms`
                );

                consoleLogger.debug(`Tracked entities stats: ${JSON.stringify(response.stats)}`);

                consoleLogger.debug(
                    `End of chunk ${index + 1}/${
                        chunkedTrackedEntities.length
                    } of tracked entities to ${action} for module ${glassModuleName}.`
                );
                return mapToImportSummary(response, TRACKED_ENTITY_IMPORT_SUMMARY_TYPE, metadataRepository)
                    .mapError(error => {
                        consoleLogger.error(
                            `Error importing tracked entities from file in module ${glassModuleName} with action ${action}: ${error}`
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

                consoleLogger.error(
                    `Error importing some tracked entities from file in module ${glassModuleName} with action ${action}: ${messageErrors}`
                );

                const accumulatedImportSummaries = result.data;
                const importSummariesWithMergedEventIdListWithErrorSummary = mergeImportSummaries([
                    ...accumulatedImportSummaries,
                    errorImportSummary,
                ]);
                return Future.success(importSummariesWithMergedEventIdListWithErrorSummary);
            } else {
                consoleLogger.debug(
                    `SUCCESS - All chunks of tracked entities to ${action} for module ${glassModuleName} processed.`
                );
                const importSummariesWithMergedEventIdList = mergeImportSummaries(result.data);
                return Future.success(importSummariesWithMergedEventIdList);
            }
        })
        .mapError(() => {
            consoleLogger.error(`Unknown error while processing tracked entities in chunks.`);
            return `Unknown error while processing tracked entities in chunks.`;
        });
}

// TODO: fix coupling with data layer in TrackerRepository
function importTrackedEntities(
    trackedEntitiesChunk: TrackerTrackedEntity[],
    options: {
        trackerRepository: TrackerRepository;
        async: boolean;
        action: "CREATE_AND_UPDATE" | "DELETE";
    }
): FutureData<TrackerPostResponse> {
    return options.trackerRepository.import({ trackedEntities: trackedEntitiesChunk }, options);
}
