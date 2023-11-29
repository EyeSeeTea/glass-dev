import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { Future, FutureData } from "../../../entities/Future";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import * as templates from "../../../entities/data-entry/program-templates";
import { InstanceDefaultRepository } from "../../../../data/repositories/InstanceDefaultRepository";
import { DataPackage } from "../../../entities/data-entry/DataPackage";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import { getStringFromFile } from "../utils/fileToString";
import { readTemplate } from "../egasp/ImportEGASPFile";
import { EventResult } from "../../../entities/program-rules/EventEffectTypes";
import { generateId } from "../../../entities/Ref";
import { Dhis2EventsDefaultRepository } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";

export const AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID = "q8aSKr17J5S";

export class ImportAMCSubstanceLevelData {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceDefaultRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private metadataRepository: MetadataRepository
    ) {}

    public import(file: File, action: ImportStrategy, eventListId: string | undefined): FutureData<ImportSummary> {
        return this.excelRepository
            .loadTemplate(file, AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID)
            .flatMap(_templateId => {
                const amcSubstanceTemplate = _.values(templates)
                    .map(TemplateClass => new TemplateClass())
                    .filter(t => t.id === "PROGRAM_GENERATED_v4")[0];
                return this.instanceRepository
                    .getProgram(AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID)
                    .flatMap(amcSubstanceProgram => {
                        if (amcSubstanceTemplate) {
                            return readTemplate(
                                amcSubstanceTemplate,
                                amcSubstanceProgram,
                                this.excelRepository,
                                this.instanceRepository
                            ).flatMap(dataPackage => {
                                if (dataPackage) {
                                    return this.buildEventsPayload(dataPackage, action, eventListId).flatMap(events => {
                                        if (events) {
                                            if (action === "CREATE_AND_UPDATE") {
                                                //TO DO : Run validations
                                                const validatedEventResults: EventResult = {
                                                    events: events, //TO DO : only validated events
                                                    blockingErrors: [],
                                                    nonBlockingErrors: [],
                                                };

                                                if (validatedEventResults.blockingErrors.length > 0) {
                                                    const errorSummary: ImportSummary = {
                                                        status: "ERROR",
                                                        importCount: {
                                                            ignored: 0,
                                                            imported: 0,
                                                            deleted: 0,
                                                            updated: 0,
                                                        },
                                                        nonBlockingErrors: validatedEventResults.nonBlockingErrors,
                                                        blockingErrors: validatedEventResults.blockingErrors,
                                                    };
                                                    return Future.success(errorSummary);
                                                } else {
                                                    const eventIdLineNoMap: { id: string; lineNo: number }[] = [];
                                                    const eventsWithId = validatedEventResults.events.map(e => {
                                                        const generatedId = generateId();
                                                        eventIdLineNoMap.push({
                                                            id: generatedId,
                                                            lineNo: isNaN(parseInt(e.event)) ? 0 : parseInt(e.event),
                                                        });
                                                        e.event = generatedId;
                                                        return e;
                                                    });
                                                    return this.dhis2EventsDefaultRepository
                                                        .import({ events: eventsWithId }, action)
                                                        .flatMap(result => {
                                                            return this.mapToImportSummary(
                                                                result,
                                                                validatedEventResults.nonBlockingErrors,
                                                                eventIdLineNoMap
                                                            ).flatMap(({ importSummary, eventIdList }) => {
                                                                const primaryUploadId =
                                                                    localStorage.getItem("primaryUploadId");
                                                                if (eventIdList.length > 0 && primaryUploadId) {
                                                                    //Events were imported successfully, so create and uplaod a file with event ids
                                                                    // and associate it with the upload datastore object
                                                                    const eventListBlob = new Blob(
                                                                        [JSON.stringify(eventIdList)],
                                                                        {
                                                                            type: "text/plain",
                                                                        }
                                                                    );

                                                                    const eventIdListFile = new File(
                                                                        [eventListBlob],
                                                                        `${primaryUploadId}_eventIdsFile`
                                                                    );

                                                                    return this.glassDocumentsRepository
                                                                        .save(eventIdListFile, "EGASP")
                                                                        .flatMap(fileId => {
                                                                            return this.glassUploadsRepository
                                                                                .setEventListFileId(
                                                                                    primaryUploadId,
                                                                                    fileId
                                                                                )
                                                                                .flatMap(() => {
                                                                                    return Future.success(
                                                                                        importSummary
                                                                                    );
                                                                                });
                                                                        });
                                                                } else {
                                                                    return Future.success(importSummary);
                                                                }
                                                            });
                                                        });
                                                }
                                            } //action === "DELETE"
                                            else {
                                                return this.dhis2EventsDefaultRepository
                                                    .import({ events }, action)
                                                    .flatMap(result => {
                                                        return this.mapToImportSummary(result, [], []).flatMap(
                                                            ({ importSummary }) => {
                                                                return Future.success(importSummary);
                                                            }
                                                        );
                                                    });
                                            }
                                        } else {
                                            //NO events were created on import, so no events to delete.
                                            const noEventsToDelete: ImportSummary = {
                                                status: "SUCCESS",
                                                importCount: { updated: 0, ignored: 0, imported: 0, deleted: 0 },
                                                nonBlockingErrors: [],
                                                blockingErrors: [],
                                            };
                                            return Future.success(noEventsToDelete);
                                        }
                                    });
                                } else {
                                    return Future.error("Unknow template");
                                }
                            });
                        } else {
                            return Future.error("Unknow template");
                        }
                    });
            });
    }

    private buildEventsPayload(
        dataPackage: DataPackage,
        action: ImportStrategy,
        eventListId: string | undefined
    ): FutureData<D2TrackerEvent[] | undefined> {
        if (action === "CREATE_AND_UPDATE") {
            return Future.success(
                dataPackage.dataEntries.map(
                    ({ id, orgUnit, period, attribute, dataValues, dataForm, coordinate }, index) => {
                        return {
                            event: id || (index + 6).toString(),
                            program: dataForm,
                            status: "COMPLETED",
                            orgUnit,
                            occurredAt: period,
                            attributeOptionCombo: attribute,
                            dataValues: dataValues.map(el => {
                                return { ...el, value: el.value.toString() };
                            }),
                            coordinate,
                        };
                    }
                )
            );
        } else {
            if (eventListId)
                return this.glassDocumentsRepository.download(eventListId).flatMap(file => {
                    return Future.fromPromise(getStringFromFile(file)).flatMap(_events => {
                        const eventIdList: [] = JSON.parse(_events);
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
            else {
                //No events were created during import, so no events to delete.
                return Future.success(undefined);
            }
        }
    }

    private mapToImportSummary(
        result: TrackerPostResponse,
        nonBlockingErrors: ConsistencyError[],
        eventIdLineNoMap: { id: string; lineNo: number }[]
    ): FutureData<{
        importSummary: ImportSummary;
        eventIdList: string[];
    }> {
        if (result && result.validationReport && result.stats) {
            const blockingErrorList = _.compact(
                result.validationReport.errorReports.map(summary => {
                    if (summary.message) return { error: summary.message, eventId: summary.uid };
                })
            );

            const blockingErrorsByGroup = _(blockingErrorList).groupBy("error").value();

            //Get list of DataElement Ids in error messages.
            const dataElementIds = _.compact(
                Object.entries(blockingErrorsByGroup).map(err => {
                    const errMsg = err[0];

                    //Error message type 1 contains regex in format : DataElement `{dataElementId}`
                    const pattern1 = /(?<=DataElement )`([A-Za-z0-9]{11})`/g;
                    const dataelementIds1 = pattern1.exec(errMsg);

                    //Error message type 2 contains  regex in format : {dataElementId} DataElement
                    const pattern2 = /([A-Za-z0-9]{11}) DataElement/g;
                    const dataelementsIds2 = pattern2.exec(errMsg);

                    //Error message type 3 contains  regex in format : `DataElement``{dataElementId}`
                    const pattern3 = /`(DataElement)` `([A-Za-z0-9]{11})`/g;
                    const dataelementsIds3 = pattern3.exec(errMsg);

                    if (dataelementIds1 && dataelementIds1[1]) return dataelementIds1[1];
                    else if (dataelementsIds2 && dataelementsIds2[1]) return dataelementsIds2[1];
                    else if (dataelementsIds3 && dataelementsIds3[1]) return dataelementsIds3[2];
                })
            );

            //Get list of DataElement Names in error messages.
            return this.metadataRepository.getDataElementNames(dataElementIds).flatMap(dataElementMap => {
                const importSummary: ImportSummary = {
                    status: result.status === "OK" ? "SUCCESS" : result.status,
                    importCount: {
                        imported: result.stats.created,
                        updated: result.stats.updated,
                        ignored: result.stats.ignored,
                        deleted: result.stats.deleted,
                    },
                    blockingErrors: Object.entries(blockingErrorsByGroup).map(err => {
                        const dataElementInErrMsg = dataElementIds.filter(de => err[0].includes(de));

                        if (dataElementInErrMsg && dataElementInErrMsg[0] && dataElementInErrMsg.length === 1) {
                            //There should be only one dataelement id in each errMsg

                            const dataElementName = dataElementMap.find(de => de.id === dataElementInErrMsg[0]);
                            //Replace DataElement Ids with DataElement Names in error messages.
                            const parsedErrMsg = err[0].replace(
                                dataElementInErrMsg[0],
                                dataElementName?.name ?? dataElementInErrMsg[0]
                            );

                            const lines = err[1].flatMap(a => eventIdLineNoMap.find(e => e.id === a.eventId)?.lineNo);
                            console.debug(lines);
                            return {
                                error: parsedErrMsg,
                                count: err[1].length,
                                lines: _.compact(lines),
                            };
                        } else {
                            const lines = err[1].flatMap(a => eventIdLineNoMap.find(e => e.id === a.eventId)?.lineNo);
                            return { error: err[0], count: err[1].length, lines: _.compact(lines) };
                        }
                    }),
                    nonBlockingErrors: nonBlockingErrors,
                    importTime: new Date(),
                };

                const eventIdList =
                    result.status === "OK"
                        ? result.bundleReport.typeReportMap.EVENT.objectReports.map(report => report.uid)
                        : [];

                return Future.success({ importSummary, eventIdList: _.compact(eventIdList) });
            });
        } else {
            return Future.success({
                importSummary: {
                    status: "ERROR",
                    importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
                    nonBlockingErrors: [],
                    blockingErrors: [{ error: result?.message ?? "An error occurred during EGASP import. ", count: 1 }],
                },
                eventIdList: [],
            });
        }
    }
}
