import _ from "lodash";

import { Dhis2EventsDefaultRepository } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import {
    getDefaultErrorImportSummary,
    ImportSummary,
    joinAllImportSummaries,
} from "../../entities/data-entry/ImportSummary";
import { Future, FutureData } from "../../entities/Future";
import { ExcelRepository } from "../../repositories/ExcelRepository";
import { GlassDocumentsRepository } from "../../repositories/GlassDocumentsRepository";
import { MetadataRepository } from "../../repositories/MetadataRepository";
import * as templates from "../../entities/data-entry/program-templates";
import { InstanceRepository } from "../../repositories/InstanceRepository";
import { getStringFromFileBlob } from "./utils/fileToString";
import { mapToImportSummary, readTemplate } from "./ImportBLTemplateEventProgram";
import { GlassUploads } from "../../entities/GlassUploads";
import { GlassUploadsRepository } from "../../repositories/GlassUploadsRepository";
import { Id } from "../../entities/Ref";
import { TrackerRepository } from "../../repositories/TrackerRepository";
import { TrackerEvent } from "../../entities/TrackedEntityInstance";
import { Maybe } from "../../../utils/ts-utils";

// NOTICE: code adapted for node environment from ImportBLTemplateEventProgram.ts (only DELETE)
export class DeleteBLTemplateEventProgram {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private metadataRepository: MetadataRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private trackerRepository: TrackerRepository
    ) {}

    public delete(params: {
        arrayBuffer: ArrayBuffer;
        programId: string;
        upload: GlassUploads;
        asyncDeleteChunkSize?: number;
        calculatedProgramId?: Id;
    }): FutureData<ImportSummary> {
        const { arrayBuffer, programId, upload, asyncDeleteChunkSize, calculatedProgramId } = params;
        return this.excelRepository.loadTemplateFromArrayBuffer(arrayBuffer, programId).flatMap(_templateId => {
            const template = _.values(templates)
                .map(TemplateClass => new TemplateClass())
                .filter(t => t.id === "PROGRAM_GENERATED_v4")[0];
            return this.instanceRepository.getProgram(programId).flatMap(program => {
                if (template) {
                    return readTemplate(
                        template,
                        program,
                        this.excelRepository,
                        this.instanceRepository,
                        programId
                    ).flatMap(dataPackage => {
                        if (dataPackage) {
                            return this.buildEventsPayload(upload, programId, calculatedProgramId).flatMap(
                                ({ events, calculatedEvents }) => {
                                    console.debug(
                                        `[${new Date().toISOString()}] Deleting ${events.length} events for upload ${
                                            upload.id
                                        }${
                                            calculatedProgramId
                                                ? ` and ${calculatedEvents.length} calculated events`
                                                : ""
                                        }.`
                                    );
                                    return this.deleteAllDataEvents(upload.id, events, asyncDeleteChunkSize).flatMap(
                                        importSummary => {
                                            if (importSummary.status === "SUCCESS") {
                                                console.debug(
                                                    `[${new Date().toISOString()}] All events for upload ${
                                                        upload.id
                                                    } deleted successfully.`
                                                );
                                                return this.deleteAllCalculatedEvents(
                                                    upload.id,
                                                    calculatedEvents,
                                                    asyncDeleteChunkSize
                                                ).flatMap(importSummaryCalculatedEvents => {
                                                    return Future.success({
                                                        ...importSummaryCalculatedEvents,
                                                        importCount: {
                                                            imported:
                                                                importSummary.importCount.imported +
                                                                importSummaryCalculatedEvents.importCount.imported,
                                                            updated:
                                                                importSummary.importCount.updated +
                                                                importSummaryCalculatedEvents.importCount.updated,
                                                            ignored:
                                                                importSummary.importCount.ignored +
                                                                importSummaryCalculatedEvents.importCount.ignored,
                                                            deleted:
                                                                importSummary.importCount.deleted +
                                                                importSummaryCalculatedEvents.importCount.deleted,
                                                            total:
                                                                importSummary.importCount.total +
                                                                importSummaryCalculatedEvents.importCount.total,
                                                        },
                                                        nonBlockingErrors: [
                                                            ...importSummary.nonBlockingErrors,
                                                            ...importSummaryCalculatedEvents.nonBlockingErrors,
                                                        ],
                                                        blockingErrors: [
                                                            ...importSummary.blockingErrors,
                                                            ...importSummaryCalculatedEvents.blockingErrors,
                                                        ],
                                                    });
                                                });
                                            } else {
                                                console.error(
                                                    `[${new Date().toISOString()}] Some events for upload ${
                                                        upload.id
                                                    } could not be deleted.`
                                                );
                                                return Future.success(importSummary);
                                            }
                                        }
                                    );
                                }
                            );
                        } else {
                            return Future.error("Unknown template");
                        }
                    });
                } else {
                    return Future.error("Unknown template");
                }
            });
        });
    }

    private deleteAllDataEvents(
        uploadId: Id,
        events: TrackerEvent[],
        asyncDeleteChunkSize: Maybe<number>
    ): FutureData<ImportSummary> {
        if (!events.length) {
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
            return this.glassUploadsRepository.setEventListDataDeleted(uploadId).flatMap(() => {
                return Future.success(summary);
            });
        }

        return this.deleteAllEvents(events, asyncDeleteChunkSize).flatMap(importSummary => {
            if (importSummary.status === "SUCCESS") {
                console.debug(
                    `[${new Date().toISOString()}] All events to DELETE for upload ${uploadId} processed successfully.`
                );
                return this.glassUploadsRepository.setEventListDataDeleted(uploadId).flatMap(() => {
                    return Future.success(importSummary);
                });
            } else {
                console.error(`[${new Date().toISOString()}] Some events for upload ${uploadId} could not be deleted.`);
                return Future.success(importSummary);
            }
        });
    }

    private deleteAllCalculatedEvents(
        uploadId: Id,
        calculatedEvents: TrackerEvent[],
        asyncDeleteChunkSize: Maybe<number>
    ): FutureData<ImportSummary> {
        if (!calculatedEvents.length) {
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
            return this.glassUploadsRepository.setCalculatedEventListDataDeleted(uploadId).flatMap(() => {
                return Future.success(summary);
            });
        }

        return this.deleteAllEvents(calculatedEvents, asyncDeleteChunkSize).flatMap(importSummary => {
            if (importSummary.status === "SUCCESS") {
                console.debug(
                    `[${new Date().toISOString()}] All calculated events to DELETE for upload ${uploadId} processed successfully.`
                );
                return this.glassUploadsRepository.setCalculatedEventListDataDeleted(uploadId).flatMap(() => {
                    return Future.success(importSummary);
                });
            } else {
                console.error(
                    `[${new Date().toISOString()}] Some calculated events for upload ${uploadId} could not be deleted.`
                );
                return Future.success(importSummary);
            }
        });
    }

    private deleteAllEvents(events: TrackerEvent[], asyncDeleteChunkSize: Maybe<number>): FutureData<ImportSummary> {
        if (!asyncDeleteChunkSize) {
            return this.deleteEventsInBulk(events);
        } else {
            return this.deleteEventsInChunks(events, asyncDeleteChunkSize);
        }
    }

    private deleteEventsInBulk(events: TrackerEvent[]): FutureData<ImportSummary> {
        return this.dhis2EventsDefaultRepository.import({ events }, "DELETE").flatMap(result => {
            return mapToImportSummary(result, "event", this.metadataRepository).flatMap(({ importSummary }) => {
                return Future.success(importSummary);
            });
        });
    }

    private deleteEventsInChunks(events: TrackerEvent[], asyncDeleteChunkSize: number): FutureData<ImportSummary> {
        const chunkedEvents = _(events).chunk(asyncDeleteChunkSize).value();

        const $deleteEvents = chunkedEvents.map((eventChunk, index) => {
            console.debug(
                `[${new Date().toISOString()}] Chunk ${index + 1}/${chunkedEvents.length} of events to DELETE.`
            );

            return this.deleteEventsInBulk(eventChunk)
                .mapError(error => {
                    console.error(`[${new Date().toISOString()}] Error deleting events: ${error}`);
                    const errorImportSummary = getDefaultErrorImportSummary({
                        blockingErrors: [{ error: error, count: 1 }],
                    });

                    return errorImportSummary;
                })
                .map(importSummary => {
                    console.debug(
                        `[${new Date().toISOString()}] Chunk ${index + 1}/${
                            chunkedEvents.length
                        } of events to DELETE processed.`
                    );
                    return importSummary;
                });
        });

        return Future.sequentialWithAccumulation($deleteEvents, {
            stopOnError: true,
        })
            .flatMap(result => {
                if (result.type === "error") {
                    const errorImportSummary = result.error;
                    const messageErrors = errorImportSummary.blockingErrors.map(error => error.error).join(", ");

                    console.error(`[${new Date().toISOString()}] Error deleting some events: ${messageErrors}`);

                    const accumulatedImportSummaries = result.data;

                    return Future.success(joinAllImportSummaries([...accumulatedImportSummaries, errorImportSummary]));
                } else {
                    console.debug(`[${new Date().toISOString()}] SUCCESS - All chunks of events to DELETE processed.`);
                    const importSummary = joinAllImportSummaries(result.data);
                    return Future.success(importSummary);
                }
            })
            .mapError(() => `[${new Date().toISOString()}] - Unknown error while deleting events in chunks.`);
    }

    private buildEventsPayload(
        upload: GlassUploads,
        programId: Id,
        calculatedProgramId?: Id
    ): FutureData<{
        events: TrackerEvent[];
        calculatedEvents: TrackerEvent[];
    }> {
        const { eventListFileId, eventListDataDeleted, calculatedEventListFileId, calculatedEventListDataDeleted } =
            upload;
        return Future.joinObj({
            events:
                eventListFileId && !eventListDataDeleted
                    ? this.getEventsFromListFileId(eventListFileId, programId)
                    : Future.success([]),
            calculatedEvents:
                calculatedEventListFileId && !calculatedEventListDataDeleted && calculatedProgramId
                    ? this.getEventsFromListFileId(calculatedEventListFileId, calculatedProgramId)
                    : Future.success([]),
        }).flatMap(({ events, calculatedEvents }) => {
            return Future.success({
                events: events,
                calculatedEvents: calculatedEvents,
            });
        });
    }

    private getEventsFromListFileId(listFileId: string, programId: Id): FutureData<TrackerEvent[]> {
        return this.glassDocumentsRepository.download(listFileId).flatMap(eventListFileBlob => {
            return getStringFromFileBlob(eventListFileBlob).flatMap(_events => {
                const eventIdList: Id[] = JSON.parse(_events);
                return this.trackerRepository
                    .getExistingEventsIdsByIds(eventIdList, programId)
                    .flatMap(existingEventsIds => {
                        const events: TrackerEvent[] = existingEventsIds.map(eventId => {
                            return {
                                event: eventId,
                                program: "",
                                programStage: "",
                                status: "COMPLETED",
                                orgUnit: "",
                                occurredAt: "",
                                attributeOptionCombo: "",
                                dataValues: [],
                            };
                        });
                        return Future.success(events);
                    });
            });
        });
    }
}
