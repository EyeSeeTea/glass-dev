import { Dhis2EventsDefaultRepository, Event } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import { Future, FutureData } from "../../entities/Future";
import { ImportSummary } from "../../entities/data-entry/ImportSummary";
import * as templates from "../../../data/templates";
import { EGASPProgramDefaultRepository } from "../../../data/repositories/bulk-load/EGASPProgramDefaultRepository";
import { Template } from "../../entities/Template";
import { DataForm } from "../../entities/DataForm";
import { ExcelReader } from "../../utils/ExcelReader";
import { ExcelRepository } from "../../repositories/ExcelRepository";
import { DataPackage, DataPackageDataValue } from "../../entities/data-entry/EGASPData";
import { EventsPostResponse } from "@eyeseetea/d2-api/api/events";
import { ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";
import { GlassDocumentsRepository } from "../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../repositories/GlassUploadsRepository";

export class ImportEGASPFile {
    constructor(
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private egaspProgramDefaultRepository: EGASPProgramDefaultRepository,
        private excelRepository: ExcelRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository
    ) {}

    public importEGASPFile(file: File, action: ImportStrategy): FutureData<ImportSummary> {
        return this.excelRepository.loadTemplate(file).flatMap(_templateId => {
            const egaspTemplate = _.values(templates).map(TemplateClass => new TemplateClass())[0];

            return this.egaspProgramDefaultRepository.getProgramEGASP().flatMap(egaspProgram => {
                if (egaspTemplate) {
                    return this.readTemplate(egaspTemplate, egaspProgram).flatMap(dataPackage => {
                        if (dataPackage) {
                            const events = this.buildEventsPayload(dataPackage);
                            return this.dhis2EventsDefaultRepository.import({ events }, action).flatMap(result => {
                                const { importSummary, eventIdList } = this.mapToImportSummary(result);

                                const primaryUploadId = localStorage.getItem("primaryUploadId");
                                if (eventIdList.length > 0 && primaryUploadId) {
                                    //TO DO : upload eventlistid to DHIS Document
                                    const eventListBlob = new Blob([JSON.stringify(eventIdList)], {
                                        type: "text/plain",
                                    });

                                    const eventIdListFile = new File(
                                        [eventListBlob],
                                        `${primaryUploadId}_eventIdsFile`
                                    );

                                    this.glassDocumentsRepository.save(eventIdListFile, "EGASP").run(
                                        fileId => {
                                            this.glassUploadsRepository.setEventListFileId(primaryUploadId, fileId).run(
                                                () => {
                                                    console.debug(
                                                        `Updated upload datastore object with eventListFileId`
                                                    );
                                                },
                                                err => {
                                                    console.debug(
                                                        `Error updating upload datastore object with eventListFileId :  ${err}`
                                                    );
                                                }
                                            );
                                        },
                                        err => {
                                            console.debug(`Error uploading event id list file ${err}`);
                                        }
                                    );
                                }

                                return Future.success(importSummary);
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

    private mapToImportSummary(result: EventsPostResponse): {
        importSummary: ImportSummary;
        eventIdList: string[];
    } {
        if (result && result.importSummaries) {
            const blockingErrorList = _.compact(
                result.importSummaries.map(summary => {
                    if (summary.status === "ERROR") {
                        if (summary.description) return summary.description;
                        else {
                            return summary.conflicts.map(
                                conflict => `Object : ${conflict.object}, Value : ${conflict.value}`
                            );
                        }
                    }
                })
            );

            const blockingErrorsByCount = _.countBy(blockingErrorList);
            const importSummary = {
                status: result.status,
                importCount: {
                    imported: result.imported,
                    updated: result.updated,
                    ignored: result.ignored,
                    deleted: result.deleted,
                },
                blockingErrors: Object.entries(blockingErrorsByCount).map(err => {
                    return { error: err[0], count: err[1] };
                }),
                nonBlockingErrors: [], //Non-blocking errors set on running consistency checks
            };

            const eventIdList = result.importSummaries.map(summary => {
                if (summary.status === "SUCCESS") {
                    return summary.reference;
                }
            });

            return { importSummary, eventIdList: _.compact(eventIdList) };
        } else {
            return {
                importSummary: {
                    status: "ERROR",
                    importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
                    nonBlockingErrors: [],
                    blockingErrors: [{ error: "An unexpected error has ocurred saving events", count: 1 }],
                },
                eventIdList: [],
            };
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

    private buildEventsPayload(dataPackage: DataPackage): Event[] {
        return dataPackage.dataEntries.map(({ id, orgUnit, period, attribute, dataValues, dataForm, coordinate }) => {
            return {
                event: id,
                program: dataForm,
                status: "COMPLETED",
                orgUnit,
                eventDate: period,
                attributeOptionCombo: attribute,
                dataValues: dataValues,
                coordinate,
            };
        });
    }

    private formatDhis2Value(item: DataPackageDataValue, dataForm: DataForm): DataPackageDataValue | undefined {
        const dataElement = dataForm.dataElements.find(({ id }) => item.dataElement === id);
        const booleanValue = String(item.optionId) === "true" || item.optionId === "true";

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
