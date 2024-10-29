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

// NOTICE: code adapted for node environment from ImportBLTemplateEventProgram.ts (only DELETE)
export class DeleteBLTemplateEventProgram {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private metadataRepository: MetadataRepository
    ) {}

    public delete(
        arrayBuffer: ArrayBuffer,
        programId: string,
        eventListFileId: string | undefined,
        calculatedEventListFileId?: string
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
                            return this.buildEventsPayload(eventListFileId, calculatedEventListFileId).flatMap(
                                events => {
                                    return this.deleteEvents(events);
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

    private deleteEvents(events: D2TrackerEvent[]): FutureData<ImportSummary> {
        return this.dhis2EventsDefaultRepository.import({ events }, "DELETE").flatMap(result => {
            return mapToImportSummary(result, "event", this.metadataRepository).flatMap(({ importSummary }) => {
                return Future.success(importSummary);
            });
        });
    }

    private buildEventsPayload(
        eventListFileId: string | undefined,
        calculatedEventListFileId?: string
    ): FutureData<D2TrackerEvent[]> {
        return Future.joinObj({
            events: eventListFileId ? this.getEventsFromListFileId(eventListFileId) : Future.success([]),
            calculatedEvents: calculatedEventListFileId
                ? this.getEventsFromListFileId(calculatedEventListFileId)
                : Future.success([]),
        }).flatMap(({ events, calculatedEvents }) => {
            return Future.success([...events, ...calculatedEvents]);
        });
    }

    private getEventsFromListFileId(listFileId: string): FutureData<D2TrackerEvent[]> {
        return this.glassDocumentsRepository.download(listFileId).flatMap(eventListFileBlob => {
            return getStringFromFileBlob(eventListFileBlob).flatMap(_events => {
                const eventIdList: string[] = JSON.parse(_events);
                const events: D2TrackerEvent[] = eventIdList.map(eventId => {
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
    }
}
