import _ from "lodash";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";

import {
    ImportSummary,
    ImportSummaryWithEventIdList,
    getDefaultErrorImportSummaryWithEventIdList,
    mergeImportSummaries,
} from "../../../entities/data-entry/ImportSummary";
import { FutureData, Future, ParallelAccumulatedData } from "../../../entities/Future";
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
    skipSideEffects?: boolean;
    maxConcurrency?: number;
}): FutureData<{
    allImportSummaries: ImportSummary[];
    mergedEventIdList: Id[];
    hasBlockingErrors: boolean;
}> {
    const {
        trackedEntities,
        chunkSize = DEFAULT_ASYNC_UPLOAD_DELETE_CHUNK_SIZE,
        glassModuleName,
        action,
        trackerRepository,
        metadataRepository,
        async = false,
        skipSideEffects = false,
        maxConcurrency = 1,
    } = params;
    const $importTrackedEntities = buildImportChunkFutures({
        trackedEntities,
        chunkSize,
        glassModuleName,
        action,
        trackerRepository,
        metadataRepository,
        async,
        skipSideEffects,
    });

    if (maxConcurrency === 1) {
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
                    return Future.success({
                        ...importSummariesWithMergedEventIdListWithErrorSummary,
                        hasBlockingErrors: true,
                    });
                } else {
                    consoleLogger.debug(
                        `SUCCESS - All chunks of tracked entities to ${action} for module ${glassModuleName} processed.`
                    );
                    const importSummariesWithMergedEventIdList = mergeImportSummaries(result.data);
                    return Future.success({ ...importSummariesWithMergedEventIdList, hasBlockingErrors: false });
                }
            })
            .mapError(() => {
                consoleLogger.error(`Unknown error while processing tracked entities in chunks.`);
                return `Unknown error while processing tracked entities in chunks.`;
            });
    } else {
        return Future.parallelWithAccumulation($importTrackedEntities, {
            maxConcurrency,
            stopOnError: true,
        })
            .flatMap(result => toImportChunksResult(result, glassModuleName, action))
            .mapError(() => {
                consoleLogger.error(`Unknown error while processing tracked entities in chunks.`);
                return `Unknown error while processing tracked entities in chunks.`;
            });
    }
}

/**
 * Async-upload-only variant of importOrDeleteTrackedEntitiesInChunks (import only): keeps
 * maxConcurrency tracker requests in flight with a rolling pool instead of waiting for each
 * wave of requests to finish before starting the next one.
 */
export function importTrackedEntitiesInChunksForAsyncUpload(params: {
    trackedEntities: TrackerTrackedEntity[];
    chunkSize?: number;
    glassModuleName: string;
    trackerRepository: TrackerRepository;
    metadataRepository: MetadataRepository;
    skipSideEffects?: boolean;
    maxConcurrency?: number;
}): FutureData<ImportChunksResult> {
    const {
        trackedEntities,
        chunkSize = DEFAULT_ASYNC_UPLOAD_DELETE_CHUNK_SIZE,
        glassModuleName,
        trackerRepository,
        metadataRepository,
        skipSideEffects = false,
        maxConcurrency = 1,
    } = params;

    const action = "CREATE_AND_UPDATE";

    const $importTrackedEntities = buildImportChunkFutures({
        trackedEntities,
        chunkSize,
        glassModuleName,
        action,
        trackerRepository,
        metadataRepository,
        async: false,
        skipSideEffects,
    });

    return Future.parallelWithAccumulationRolling($importTrackedEntities, {
        maxConcurrency,
        stopOnError: true,
    })
        .flatMap(result => toImportChunksResult(result, glassModuleName, action))
        .mapError(() => {
            consoleLogger.error(`Unknown error while processing tracked entities in chunks.`);
            return `Unknown error while processing tracked entities in chunks.`;
        });
}

type ImportChunksResult = {
    allImportSummaries: ImportSummary[];
    mergedEventIdList: Id[];
    hasBlockingErrors: boolean;
};

function buildImportChunkFutures(params: {
    trackedEntities: TrackerTrackedEntity[];
    chunkSize: number;
    glassModuleName: string;
    action: "CREATE_AND_UPDATE" | "DELETE";
    trackerRepository: TrackerRepository;
    metadataRepository: MetadataRepository;
    async: boolean;
    skipSideEffects: boolean;
}): Array<Future<ImportSummaryWithEventIdList, ImportSummaryWithEventIdList>> {
    const {
        trackedEntities,
        chunkSize,
        glassModuleName,
        action,
        trackerRepository,
        metadataRepository,
        async,
        skipSideEffects,
    } = params;

    consoleLogger.debug(`Starting ${action} ${trackedEntities.length} tracked entities in chunks of ${chunkSize}.`);
    const chunkedTrackedEntities = _(trackedEntities).chunk(chunkSize).value();

    return chunkedTrackedEntities.map((trackedEntitiesChunk, index) => {
        consoleLogger.debug(
            `Chunk ${index + 1}/${
                chunkedTrackedEntities.length
            } of tracked entities to ${action} for module ${glassModuleName}.`
        );

        return importTrackedEntities(trackedEntitiesChunk, {
            trackerRepository,
            action,
            async,
            skipSideEffects,
        })
            .mapError(error => {
                consoleLogger.error(
                    `Error importing tracked entities from file in module ${glassModuleName} with action ${action}: ${error}`
                );
                const errorImportSummary: ImportSummaryWithEventIdList = getDefaultErrorImportSummaryWithEventIdList({
                    blockingErrors: [{ error: error, count: 1 }],
                });

                return errorImportSummary;
            })
            .flatMap(response => {
                consoleLogger.debug(`Tracked entities ${action} stats: ${JSON.stringify(response.stats)}`);

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
}

function toImportChunksResult(
    result: ParallelAccumulatedData<ImportSummaryWithEventIdList, ImportSummaryWithEventIdList>,
    glassModuleName: string,
    action: "CREATE_AND_UPDATE" | "DELETE"
): Future<never, ImportChunksResult> {
    if (result.type === "error") {
        const errorImportSummaries = result.errors;
        const messageErrors = errorImportSummaries
            .flatMap(errorImportSummary => errorImportSummary.importSummary.blockingErrors)
            .map(error => error.error)
            .join(", ");

        consoleLogger.error(
            `Error importing some tracked entities from file in module ${glassModuleName} with action ${action}: ${messageErrors}`
        );

        const importSummariesWithMergedEventIdListWithErrorSummary = mergeImportSummaries([
            ...result.data,
            ...errorImportSummaries,
        ]);

        return Future.success({
            ...importSummariesWithMergedEventIdListWithErrorSummary,
            hasBlockingErrors: true,
        });
    } else {
        consoleLogger.debug(
            `SUCCESS - All chunks of tracked entities to ${action} for module ${glassModuleName} processed.`
        );

        return Future.success({ ...mergeImportSummaries(result.data), hasBlockingErrors: false });
    }
}

// TODO: fix coupling with data layer in TrackerRepository
function importTrackedEntities(
    trackedEntitiesChunk: TrackerTrackedEntity[],
    options: {
        trackerRepository: TrackerRepository;
        async: boolean;
        skipSideEffects?: boolean;
        action: "CREATE_AND_UPDATE" | "DELETE";
    }
): FutureData<TrackerPostResponse> {
    return options.trackerRepository.import({ trackedEntities: trackedEntitiesChunk }, options);
}
