import { Dhis2EventsDefaultRepository, Event } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import { Future, FutureData } from "../../entities/Future";
import { ImportConflictCount, ImportSummary } from "../../entities/data-entry/ImportSummary";
import * as templates from "../../../data/templates";
import { EGASPProgramDefaultRepository } from "../../../data/repositories/bulk-load/EGASPProgramDefaultRepository";
import { Template } from "../../entities/Template";
import { DataForm } from "../../entities/DataForm";
import { ExcelReader } from "../../utils/ExcelReader";
import { ExcelRepository } from "../../repositories/ExcelRepository";
import { DataPackage, DataPackageDataValue } from "../../entities/data-entry/EGASPData";
import { EventsPostResponse } from "@eyeseetea/d2-api/api/events";
import { ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";

export class ImportEGASPFile {
    constructor(
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private egaspProgramDefaultRepository: EGASPProgramDefaultRepository,
        private excelRepository: ExcelRepository
    ) {}

    public importEGASPFile(file: File, action: ImportStrategy): FutureData<ImportSummary> {
        console.debug(file);

        return this.excelRepository.loadTemplate(file).flatMap(templateId => {
            console.debug(`Loaded template ${templateId}`);
            const egaspTemplate = _.values(templates).map(TemplateClass => new TemplateClass())[0];

            return this.egaspProgramDefaultRepository.getProgramEGASP().flatMap(egaspProgram => {
                if (egaspTemplate) {
                    return this.readTemplate(egaspTemplate, egaspProgram).flatMap(dataPackage => {
                        if (dataPackage) {
                            const events = this.buildEventsPayload(dataPackage);
                            return this.dhis2EventsDefaultRepository.import({ events }, action).flatMap(result => {
                                return Future.success(this.mapToImportSummary(result));
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

    private mapToImportSummary(result: EventsPostResponse): ImportSummary {
        if (result && result.importSummaries) {
            const importCounts: ImportConflictCount[] = result.importSummaries.map(summary => {
                return {
                    importCount: {
                        imported: summary.importCount.imported,
                        updated: summary.importCount.updated,
                        ignored: summary.importCount.ignored,
                        deleted: summary.importCount.deleted,
                    },
                    conflicts: summary.status === "ERROR" ? summary.conflicts : [],
                };
            });

            const add = (accumulator: ImportConflictCount, currentVal: ImportConflictCount): ImportConflictCount => {
                return {
                    importCount: {
                        imported: accumulator.importCount.imported + currentVal.importCount.imported,
                        updated: accumulator.importCount.updated + currentVal.importCount.updated,
                        ignored: accumulator.importCount.ignored + currentVal.importCount.ignored,
                        deleted: accumulator.importCount.deleted + currentVal.importCount.deleted,
                    },
                    conflicts: [...accumulator.conflicts, ...currentVal.conflicts],
                };
            };

            const importCountSum = importCounts.reduce(add, {
                importCount: { imported: 0, updated: 0, ignored: 0, deleted: 0 },
                conflicts: [],
            });

            return {
                status: result.status,
                importCount: importCountSum.importCount,
                blockingErrors: importCountSum.conflicts.map(conflict => ({ error: conflict.value, count: 1 })),
                nonBlockingErrors: [],
            };
        } else {
            return {
                status: "ERROR",
                importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
                nonBlockingErrors: [],
                blockingErrors: [{ error: "An unexpected error has ocurred saving events", count: 1 }],
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
