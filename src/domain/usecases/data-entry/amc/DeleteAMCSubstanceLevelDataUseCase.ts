import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import moment from "moment";
import _ from "lodash";

import { Dhis2EventsDefaultRepository } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { Future, FutureData } from "../../../entities/Future";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import * as templates from "../../../entities/data-entry/program-templates";
import { DataPackage } from "../../../entities/data-entry/DataPackage";
import { InstanceRepository } from "../../../repositories/InstanceRepository";
import { UseCase } from "../../../../CompositionRoot";
import { ListGlassATCLastVersionKeysByYear } from "../../../entities/GlassAtcVersionData";
import { GlassATCRepository } from "../../../repositories/GlassATCRepository";
import { AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID } from "../../../../data/repositories/data-entry/AMCSubstanceDataDefaultRepository";
import { getStringFromFileBlob } from "../utils/fileToString";
import { ATC_VERSION_DATA_ELEMENT_ID, mapToImportSummary, readTemplate } from "../ImportBLTemplateEventProgram";

// NOTICE: code adapted for node environment from ImportBLTemplateEventProgram.ts (only DELETE);
export class DeleteAMCSubstanceLevelDataUseCase implements UseCase {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private metadataRepository: MetadataRepository,
        private glassAtcRepository: GlassATCRepository
    ) {}

    public execute(
        arrayBuffer: ArrayBuffer,
        eventListFileId: string | undefined,
        calculatedEventListFileId?: string
    ): FutureData<ImportSummary> {
        return this.excelRepository
            .loadTemplateFromArrayBuffer(arrayBuffer, AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID)
            .flatMap(_templateId => {
                const template = _.values(templates)
                    .map(TemplateClass => new TemplateClass())
                    .filter(t => t.id === "PROGRAM_GENERATED_v4")[0];
                return this.instanceRepository.getProgram(AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID).flatMap(program => {
                    if (template) {
                        return readTemplate(
                            template,
                            program,
                            this.excelRepository,
                            this.instanceRepository,
                            AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID
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

    buildEventsPayloadForAMCSubstances(dataPackage: DataPackage): FutureData<D2TrackerEvent[]> {
        const atcVerionYears = dataPackage.dataEntries.reduce((acc: string[], dataEntry) => {
            const atcVerionYear = dataEntry.dataValues.find(
                ({ dataElement }) => dataElement === ATC_VERSION_DATA_ELEMENT_ID
            )?.value;
            return atcVerionYear ? [...acc, atcVerionYear.toString()] : acc;
        }, []);

        const uniqueAtcVerionYears = Array.from(new Set(atcVerionYears));

        return this.glassAtcRepository.getAtcHistory().flatMap(atcVersionHistory => {
            const atcVersionHistoryYears = atcVersionHistory.map(atcHistory => atcHistory.year.toString());
            const missingAtcVersionYearsInHistory = uniqueAtcVerionYears.filter(
                year => !atcVersionHistoryYears.includes(year)
            );
            return this.glassAtcRepository
                .getListOfLastAtcVersionsKeysByYears(
                    uniqueAtcVerionYears.filter(year => !missingAtcVersionYearsInHistory.includes(year))
                )
                .flatMap(atcVersionKeysByYear => {
                    return Future.success(this.mapDataPackageToD2TrackerEvents(dataPackage, atcVersionKeysByYear));
                });
        });
    }

    mapDataPackageToD2TrackerEvents(
        dataPackage: DataPackage,
        atcVersionKeysByYear?: ListGlassATCLastVersionKeysByYear
    ): D2TrackerEvent[] {
        return dataPackage.dataEntries.map(
            ({ id, orgUnit, period, attribute, dataValues, dataForm, coordinate }, index) => {
                const occurredAt =
                    dataForm === AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID
                        ? moment(new Date(`${period.split("-").at(0)}-01-01`))
                              .toISOString()
                              .split("T")
                              .at(0) ?? period
                        : period;

                return {
                    event: id || (index + 6).toString(),
                    program: dataForm,
                    status: "COMPLETED",
                    orgUnit,
                    occurredAt: occurredAt,
                    attributeOptionCombo: attribute,
                    dataValues: dataValues.map(el => {
                        if (
                            dataForm === AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID &&
                            el.dataElement === ATC_VERSION_DATA_ELEMENT_ID
                        ) {
                            const atcVersionKey = atcVersionKeysByYear ? atcVersionKeysByYear[el.value.toString()] : "";
                            return { ...el, value: atcVersionKey ?? "" };
                        }

                        return { ...el, value: el.value.toString() };
                    }),
                    coordinate,
                };
            }
        );
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
