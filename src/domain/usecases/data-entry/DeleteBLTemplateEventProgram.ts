import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import _ from "lodash";

import { Dhis2EventsDefaultRepository } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import { ImportSummary } from "../../entities/data-entry/ImportSummary";
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

    public delete(
        arrayBuffer: ArrayBuffer,
        programId: string,
        upload: GlassUploads,
        calculatedProgramId?: Id
    ): FutureData<ImportSummary> {
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
                                    return this.deleteEvents(upload.id, events).flatMap(importSummary => {
                                        if (importSummary.status === "SUCCESS") {
                                            return this.deleteCalculatedEvents(upload.id, calculatedEvents).flatMap(
                                                importSummaryCalculatedEvents => {
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
                                                }
                                            );
                                        } else {
                                            return Future.success(importSummary);
                                        }
                                    });
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

    private deleteEvents(uploadId: Id, events: D2TrackerEvent[]): FutureData<ImportSummary> {
        if (!events.length) {
            const summary: ImportSummary = {
                status: "SUCCESS",
                importCount: {
                    ignored: 0,
                    imported: 0,
                    deleted: 0,
                    updated: 0,
                },
                nonBlockingErrors: [],
                blockingErrors: [],
            };
            return this.glassUploadsRepository.setEventListDataDeleted(uploadId).flatMap(() => {
                return Future.success(summary);
            });
        }

        return this.dhis2EventsDefaultRepository.import({ events }, "DELETE").flatMap(result => {
            return mapToImportSummary(result, "event", this.metadataRepository).flatMap(({ importSummary }) => {
                if (importSummary.status === "SUCCESS") {
                    return this.glassUploadsRepository.setEventListDataDeleted(uploadId).flatMap(() => {
                        return Future.success(importSummary);
                    });
                } else {
                    return Future.success(importSummary);
                }
            });
        });
    }

    private deleteCalculatedEvents(uploadId: Id, calculatedEvents: D2TrackerEvent[]): FutureData<ImportSummary> {
        if (!calculatedEvents.length) {
            const summary: ImportSummary = {
                status: "SUCCESS",
                importCount: {
                    ignored: 0,
                    imported: 0,
                    deleted: 0,
                    updated: 0,
                },
                nonBlockingErrors: [],
                blockingErrors: [],
            };
            return this.glassUploadsRepository.setCalculatedEventListDataDeleted(uploadId).flatMap(() => {
                return Future.success(summary);
            });
        }

        return this.dhis2EventsDefaultRepository.import({ events: calculatedEvents }, "DELETE").flatMap(result => {
            return mapToImportSummary(result, "event", this.metadataRepository).flatMap(({ importSummary }) => {
                if (importSummary.status === "SUCCESS") {
                    return this.glassUploadsRepository.setCalculatedEventListDataDeleted(uploadId).flatMap(() => {
                        return Future.success(importSummary);
                    });
                } else {
                    return Future.success(importSummary);
                }
            });
        });
    }

    private buildEventsPayload(
        upload: GlassUploads,
        programId: Id,
        calculatedProgramId?: Id
    ): FutureData<{
        events: D2TrackerEvent[];
        calculatedEvents: D2TrackerEvent[];
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

    private getEventsFromListFileId(listFileId: string, programId: Id): FutureData<D2TrackerEvent[]> {
        return this.glassDocumentsRepository.download(listFileId).flatMap(eventListFileBlob => {
            return getStringFromFileBlob(eventListFileBlob).flatMap(_events => {
                const eventIdList: Id[] = JSON.parse(_events);
                return this.trackerRepository
                    .getExistingEventsIdsByIds(eventIdList, programId)
                    .flatMap(existingEventsIds => {
                        const events: D2TrackerEvent[] = existingEventsIds.map(eventId => {
                            return {
                                event: eventId,
                                program: "",
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
