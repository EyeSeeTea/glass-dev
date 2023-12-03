import { Dhis2EventsDefaultRepository } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import { InstanceDefaultRepository } from "../../../data/repositories/InstanceDefaultRepository";
import { ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";
import { ConsistencyError, ImportSummary } from "../../entities/data-entry/ImportSummary";
import { Future, FutureData } from "../../entities/Future";
import { ExcelRepository } from "../../repositories/ExcelRepository";
import { GlassDocumentsRepository } from "../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../repositories/GlassUploadsRepository";
import { MetadataRepository } from "../../repositories/MetadataRepository";
import * as templates from "../../entities/data-entry/program-templates";
import { DataForm } from "../../entities/DataForm";
import { EventResult } from "../../entities/program-rules/EventEffectTypes";
import { generateId, Id } from "../../entities/Ref";
import { DataPackage, DataPackageDataValue } from "../../entities/data-entry/DataPackage";
import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import { getStringFromFile } from "./utils/fileToString";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { ProgramRuleValidationForBLEventProgram } from "../program-rules-processing/ProgramRuleValidationForBLEventProgram";
import { ProgramRulesMetadataRepository } from "../../repositories/program-rules/ProgramRulesMetadataRepository";
import { CustomValidationForEventProgram } from "./egasp/CustomValidationForEventProgram";
import { Template } from "../../entities/Template";
import { ExcelReader } from "../../utils/ExcelReader";

export class ImportBLTemplateEventProgram {
    constructor(
        private excelRepository: ExcelRepository,
        private instanceRepository: InstanceDefaultRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private metadataRepository: MetadataRepository,
        private programRulesMetadataRepository: ProgramRulesMetadataRepository
    ) {}

    public import(
        file: File,
        action: ImportStrategy,
        eventListId: string | undefined,
        moduleName: string,
        orgUnitId: string,
        orgUnitName: string,
        period: string,
        programId: string,
        uploadIdLocalStorageName: string
    ): FutureData<ImportSummary> {
        return this.excelRepository.loadTemplate(file, programId).flatMap(_templateId => {
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
                            return this.buildEventsPayload(dataPackage, action, eventListId).flatMap(events => {
                                if (action === "CREATE_AND_UPDATE") {
                                    //Run validations on import only
                                    return this.validateEvents(
                                        events,
                                        orgUnitId,
                                        orgUnitName,
                                        period,
                                        programId
                                    ).flatMap(validatedEventResults => {
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
                                                    return mapToImportSummary(
                                                        result,
                                                        "event",
                                                        this.metadataRepository,
                                                        validatedEventResults.nonBlockingErrors,
                                                        eventIdLineNoMap
                                                    ).flatMap(summary => {
                                                        return uploadIdListFileAndSave(
                                                            uploadIdLocalStorageName,
                                                            summary,
                                                            moduleName,
                                                            this.glassDocumentsRepository,
                                                            this.glassUploadsRepository
                                                        );
                                                    });
                                                });
                                        }
                                    });
                                } //action === "DELETE"
                                else {
                                    return this.dhis2EventsDefaultRepository
                                        .import({ events }, action)
                                        .flatMap(result => {
                                            return mapToImportSummary(result, "event", this.metadataRepository).flatMap(
                                                ({ importSummary }) => {
                                                    return Future.success(importSummary);
                                                }
                                            );
                                        });
                                }
                            });
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

    private buildEventsPayload(
        dataPackage: DataPackage,
        action: ImportStrategy,
        eventListId: string | undefined
    ): FutureData<D2TrackerEvent[]> {
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
                return Future.success([]);
            }
        }
    }

    private validateEvents(
        events: D2TrackerEvent[],
        orgUnitId: string,
        orgUnitName: string,
        period: string,
        programId: string
    ): FutureData<EventResult> {
        //1. Run Program Rule Validations
        const programRuleValidations = new ProgramRuleValidationForBLEventProgram(this.programRulesMetadataRepository);

        //2. Run Custom EGASP Validations
        const customValidations = new CustomValidationForEventProgram(
            this.dhis2EventsDefaultRepository,
            this.metadataRepository
        );

        return Future.joinObj({
            programRuleValidationResults: programRuleValidations.getValidatedEvents(events, programId),
            customRuleValidationsResults: customValidations.getValidatedEvents(
                events,
                orgUnitId,
                orgUnitName,
                period,
                programId
            ),
        }).flatMap(({ programRuleValidationResults, customRuleValidationsResults }) => {
            const consolidatedValidationResults: EventResult = {
                events: programRuleValidationResults.events,
                blockingErrors: [
                    ...programRuleValidationResults.blockingErrors,
                    ...customRuleValidationsResults.blockingErrors,
                ],
                nonBlockingErrors: [
                    ...programRuleValidationResults.nonBlockingErrors,
                    ...customRuleValidationsResults.nonBlockingErrors,
                ],
            };
            return Future.success(consolidatedValidationResults);
        });
    }
}

export const uploadIdListFileAndSave = (
    uploadIdLocalStorageName: string,
    summary: { importSummary: ImportSummary; eventIdList: string[] },
    moduleName: string,
    glassDocumentsRepository: GlassDocumentsRepository,
    glassUploadsRepository: GlassUploadsRepository
): FutureData<ImportSummary> => {
    const uploadId = localStorage.getItem(uploadIdLocalStorageName);
    if (summary.eventIdList.length > 0 && uploadId) {
        //Events were imported successfully, so create and uplaod a file with event ids
        // and associate it with the upload datastore object
        const eventListBlob = new Blob([JSON.stringify(summary.eventIdList)], {
            type: "text/plain",
        });
        const eventIdListFile = new File([eventListBlob], `${uploadId}_eventIdsFile`);
        return glassDocumentsRepository.save(eventIdListFile, moduleName).flatMap(fileId => {
            return glassUploadsRepository.setEventListFileId(uploadId, fileId).flatMap(() => {
                return Future.success(summary.importSummary);
            });
        });
    } else {
        return Future.success(summary.importSummary);
    }
};

export const mapToImportSummary = (
    result: TrackerPostResponse,
    type: "event" | "trackedEntity",
    metadataRepository: MetadataRepository,
    nonBlockingErrors?: ConsistencyError[],
    eventIdLineNoMap?: { id: string; lineNo: number }[]
): FutureData<{
    importSummary: ImportSummary;
    eventIdList: string[];
}> => {
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
        return metadataRepository.getDataElementNames(dataElementIds).flatMap(dataElementMap => {
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

                        const lines = err[1].flatMap(a => eventIdLineNoMap?.find(e => e.id === a.eventId)?.lineNo);
                        console.debug(lines);
                        return {
                            error: parsedErrMsg,
                            count: err[1].length,
                            lines: _.compact(lines),
                        };
                    } else {
                        const lines = err[1].flatMap(a => eventIdLineNoMap?.find(e => e.id === a.eventId)?.lineNo);
                        return { error: err[0], count: err[1].length, lines: _.compact(lines) };
                    }
                }),
                nonBlockingErrors: nonBlockingErrors ? nonBlockingErrors : [],
                importTime: new Date(),
            };

            const eventIdList =
                result.status === "OK"
                    ? type === "event"
                        ? result.bundleReport.typeReportMap.EVENT.objectReports.map(report => report.uid)
                        : result.bundleReport.typeReportMap.TRACKED_ENTITY.objectReports.map(report => report.uid)
                    : [];

            return Future.success({ importSummary, eventIdList: _.compact(eventIdList) });
        });
    } else {
        return Future.success({
            importSummary: {
                status: "ERROR",
                importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
                nonBlockingErrors: [],
                blockingErrors: [{ error: result?.message ?? "An error occurred during import. ", count: 1 }],
            },
            eventIdList: [],
        });
    }
};

export const readTemplate = (
    template: Template,
    dataForm: DataForm,
    excelRepository: ExcelRepository,
    instanceReporsitory: InstanceDefaultRepository,
    programId: Id
): FutureData<DataPackage | undefined> => {
    const reader = new ExcelReader(excelRepository, instanceReporsitory);
    return Future.fromPromise(reader.readTemplate(template, programId)).map(excelDataValues => {
        if (!excelDataValues) return undefined;

        return {
            ...excelDataValues,
            dataEntries: excelDataValues.dataEntries.map(({ dataValues, ...dataEntry }) => {
                return {
                    ...dataEntry,
                    dataValues: _.compact(dataValues.map(value => formatDhis2Value(value, dataForm))),
                };
            }),
        };
    });
};

export const formatDhis2Value = (item: DataPackageDataValue, dataForm: DataForm): DataPackageDataValue | undefined => {
    const dataElement = dataForm.dataElements.find(({ id }) => item.dataElement === id);
    const booleanValue = String(item.value) === "true" || item.value === "true";

    if (dataElement?.valueType === "BOOLEAN") {
        return { ...item, value: booleanValue };
    }

    if (dataElement?.valueType === "TRUE_ONLY") {
        return booleanValue ? { ...item, value: true } : undefined;
    }

    const selectedOption = dataElement?.options?.find(({ id }) => item.value === id);
    const value = selectedOption?.code ?? item.value;
    return { ...item, value };
};
