import { Dhis2EventsDefaultRepository } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { D2TrackerEvent as Event } from "@eyeseetea/d2-api/api/trackerEvents";
import { Future, FutureData } from "../../../entities/Future";
import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";
import * as templates from "../../../entities/data-entry/egasp-templates";
import { EGASPProgramDefaultRepository } from "../../../../data/repositories/download-empty-template/EGASPProgramDefaultRepository";
import { Template } from "../../../entities/Template";
import { DataForm } from "../../../entities/DataForm";
import { ExcelReader } from "../../../utils/ExcelReader";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import { DataPackage, DataPackageDataValue } from "../../../entities/data-entry/DataPackage";
import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { ProgramRuleValidationForEGASP } from "../../program-rules-processing/ProgramRuleValidationForEGASP";
import { ProgramRulesMetadataRepository } from "../../../repositories/program-rules/ProgramRulesMetadataRepository";
import { EventResult } from "../../../entities/program-rules/EventEffectTypes";
import { CustomValidationForEGASP } from "./CustomValidationForEGASP";
import { getStringFromFile } from "../utils/fileToString";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { MetadataRepository } from "../../../repositories/MetadataRepository";

export class ImportEGASPFile {
    constructor(
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private egaspProgramDefaultRepository: EGASPProgramDefaultRepository,
        private excelRepository: ExcelRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private eGASPValidationRepository: ProgramRulesMetadataRepository,
        private metadataRepository: MetadataRepository
    ) {}

    public importEGASPFile(
        file: File,
        action: ImportStrategy,
        eventListId: string | undefined,
        orgUnitId: string,
        orgUnitName: string,
        period: string
    ): FutureData<ImportSummary> {
        return this.excelRepository.loadTemplate(file).flatMap(_templateId => {
            const egaspTemplate = _.values(templates).map(TemplateClass => new TemplateClass())[0];

            return this.egaspProgramDefaultRepository.getProgramEGASP().flatMap(egaspProgram => {
                if (egaspTemplate) {
                    return this.readTemplate(egaspTemplate, egaspProgram).flatMap(dataPackage => {
                        if (dataPackage) {
                            return this.buildEventsPayload(dataPackage, action, eventListId).flatMap(events => {
                                if (events) {
                                    if (action === "CREATE_AND_UPDATE") {
                                        //Run validations only on import
                                        return this.validateEGASPEvents(events, orgUnitId, orgUnitName, period).flatMap(
                                            validatedEventResults => {
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
                                                    const eventsWithoutId = validatedEventResults.events.map(e => {
                                                        e.event = "";
                                                        return e;
                                                    });
                                                    return this.dhis2EventsDefaultRepository
                                                        .import({ events: eventsWithoutId }, action)
                                                        .flatMap(result => {
                                                            return this.mapToImportSummary(
                                                                result,
                                                                validatedEventResults.nonBlockingErrors
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
                                            }
                                        );
                                    } //action === "DELETE"
                                    else {
                                        return this.dhis2EventsDefaultRepository
                                            .import({ events }, action)
                                            .flatMap(result => {
                                                return this.mapToImportSummary(result, []).flatMap(
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

    private validateEGASPEvents(
        events: Event[],
        orgUnitId: string,
        orgUnitName: string,
        period: string
    ): FutureData<EventResult> {
        //1. Run Program Rule Validations
        const programRuleValidationForEGASP = new ProgramRuleValidationForEGASP(this.eGASPValidationRepository);

        //2. Run Custom EGASP Validations
        const customEGASPValidations = new CustomValidationForEGASP(
            this.dhis2EventsDefaultRepository,
            this.metadataRepository
        );

        return Future.joinObj({
            programRuleValidationResults: programRuleValidationForEGASP.getValidatedEvents(events),
            customRuleValidationsResults: customEGASPValidations.getValidatedEvents(
                events,
                orgUnitId,
                orgUnitName,
                period
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

    private mapToImportSummary(
        result: TrackerPostResponse,
        nonBlockingErrors: ConsistencyError[]
    ): FutureData<{
        importSummary: ImportSummary;
        eventIdList: string[];
    }> {
        if (result && result.validationReport && result.stats) {
            const blockingErrorList = _.compact(
                result.validationReport.errorReports.map(summary => {
                    if (summary.message) return summary.message;
                })
            );

            const blockingErrorsByCount = _.countBy(blockingErrorList);

            //Get list of DataElement Ids in error messages.
            const dataElementIds = _.compact(
                Object.entries(blockingErrorsByCount).map(err => {
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
                    blockingErrors: Object.entries(blockingErrorsByCount).map(err => {
                        const dataElementInErrMsg = dataElementIds.filter(de => err[0].includes(de));

                        if (dataElementInErrMsg && dataElementInErrMsg[0] && dataElementInErrMsg.length === 1) {
                            //There should be only one dataelement id in each errMsg

                            const dataElementName = dataElementMap.find(de => de.id === dataElementInErrMsg[0]);
                            //Replace DataElement Ids with DataElement Names in error messages.
                            const parsedErrMsg = err[0].replace(
                                dataElementInErrMsg[0],
                                dataElementName?.name ?? dataElementInErrMsg[0]
                            );

                            return { error: parsedErrMsg, count: err[1] };
                        } else return { error: err[0], count: err[1] };
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

    private readTemplate(template: Template, dataForm: DataForm): FutureData<DataPackage | undefined> {
        const reader = new ExcelReader(this.excelRepository);
        return Future.fromPromise(reader.readTemplate(template)).map(excelDataValues => {
            if (!excelDataValues) return undefined;

            return {
                ...excelDataValues,
                dataEntries: excelDataValues.dataEntries.map(({ dataValues, ...dataEntry }) => {
                    return {
                        ...dataEntry,
                        dataValues: _.compact(dataValues.map(value => this.formatDhis2Value(value, dataForm))),
                    };
                }),
            };
        });
    }

    private buildEventsPayload(
        dataPackage: DataPackage,
        action: ImportStrategy,
        eventListId: string | undefined
    ): FutureData<Event[] | undefined> {
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
                        const events: Event[] = eventIdList.map(eventId => {
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

    private formatDhis2Value(item: DataPackageDataValue, dataForm: DataForm): DataPackageDataValue | undefined {
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
    }
}
