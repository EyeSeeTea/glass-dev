import { Dhis2EventsDefaultRepository, Event } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import { Future, FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { ImportSummary } from "../../entities/data-entry/ImportSummary";
import * as templates from "../../../data/templates";
import { EGASPProgramDefaultRepository } from "../../../data/repositories/bulk-load/EGASPProgramDefaultRepository";
import { Template } from "../../entities/Template";
import { DataForm } from "../../entities/DataForm";
import { ExcelReader } from "../../utils/ExcelReader";
import { ExcelRepository } from "../../repositories/ExcelRepository";

const PROGRAM_ID = "SOjanrinfuG";
export interface DataPackage {
    type: "programs";
    dataEntries: DataPackageData[];
}

export interface DataPackageData {
    group?: number | string;
    id?: Id;
    dataForm: Id;
    orgUnit: Id;
    period: string;
    attribute?: Id;
    trackedEntityInstance?: Id;
    programStage?: Id;
    coordinate?: {
        latitude: number;
        longitude: number;
    };
    dataValues: DataPackageDataValue[];
}
export type DataPackageValue = string | number | boolean;
export interface DataPackageDataValue {
    dataElement: Id;
    category?: Id;
    value: DataPackageValue;
    optionId?: Id;
    comment?: string;
}

export class ImportEGASPFile {
    constructor(
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private egaspProgramDefaultRepository: EGASPProgramDefaultRepository,
        private excelRepository: ExcelRepository
    ) {}

    public importEGASPFile(file: File): FutureData<ImportSummary> {
        console.debug(file);
        const importSummary: ImportSummary = {
            status: "SUCCESS",
            importCount: { imported: 99, updated: 99, ignored: 99, deleted: 99 },
            nonBlockingErrors: [],
            blockingErrors: [],
        };

        return this.excelRepository.loadTemplate(file).flatMap(templateId => {
            console.debug(PROGRAM_ID, templateId);
            const egaspTemplate = _.values(templates).map(TemplateClass => new TemplateClass())[0];
            console.debug(egaspTemplate);
            return this.egaspProgramDefaultRepository.getProgramEGASP().flatMap(egaspProgram => {
                if (egaspTemplate) {
                    return this.readTemplate(egaspTemplate, egaspProgram).flatMap(dataPackage => {
                        console.debug(dataPackage);
                        if (dataPackage) {
                            const events = this.buildEventsPayload(dataPackage);
                            return this.dhis2EventsDefaultRepository.import({ events }).flatMap(result => {
                                console.debug("ASYNC POST EVENTS : " + result);
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
