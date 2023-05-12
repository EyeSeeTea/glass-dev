import { TrackedEntityInstance } from "@eyeseetea/d2-api/api/trackedEntityInstances";
import { Dhis2EventsDefaultRepository, Event } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { ImportSummary } from "../../entities/data-entry/ImportSummary";
import * as templates from "../../../data/templates";
import { EGASPProgramDefaultRepository } from "../../../data/repositories/bulk-load/EGASPProgramDefaultRepository";

const PROGRAM_ID = "SOjanrinfuG";
export interface DataPackage {
    type: "programs";
    dataEntries: DataPackageData[];
    trackedEntityInstances: TrackedEntityInstance[];
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
        private egaspProgramDefaultRepository: EGASPProgramDefaultRepository
    ) {}

    public importEGASPFile(file: File): FutureData<ImportSummary> {
        console.debug(file);
        const importSummary: ImportSummary = {
            status: "SUCCESS",
            importCount: { imported: 99, updated: 99, ignored: 99, deleted: 99 },
            nonBlockingErrors: [],
            blockingErrors: [],
        };

        console.debug(PROGRAM_ID);
        const EGASPTemplate = _.values(templates).map(TemplateClass => new TemplateClass())[0];
        console.debug(EGASPTemplate);

        return this.egaspProgramDefaultRepository.getProgramEGASP().map(EGASPProgram => {
            console.debug(EGASPProgram);
            const dataPackage: DataPackage = { type: "programs", dataEntries: [], trackedEntityInstances: [] };
            this.dhis2EventsDefaultRepository.import({ events: this.buildEventsPayload(dataPackage) });
            return importSummary;
        });
    }

    // private async readTemplate(template: Template, dataForm: DataForm): Promise<DataPackage | undefined> {
    //     const reader = new ExcelReader(this.excelRepository);
    //     const excelDataValues = await reader.readTemplate(template, dataForm);
    //     if (!excelDataValues) return undefined;

    //     const dataPackage = excelDataValues;

    //     return {
    //         ...dataPackage,
    //         dataEntries: dataPackage.dataEntries.map(({ dataValues, ...dataEntry }) => {
    //             return {
    //                 ...dataEntry,
    //                 dataValues: _.compact(dataValues.map(value => this.formatDhis2Value(value, dataForm))),
    //             };
    //         }),
    //     };
    // }

    // private formatDhis2Value = (item: DataPackageDataValue, dataForm: DataForm): DataPackageDataValue | undefined => {
    //     const dataElement = dataForm.dataElements.find(({ id }) => item.dataElement === id);
    //     const booleanValue = String(item.optionId) === "true" || item.optionId === "true";

    //     if (dataElement?.valueType === "BOOLEAN") {
    //         return { ...item, value: booleanValue };
    //     }

    //     if (dataElement?.valueType === "TRUE_ONLY") {
    //         return booleanValue ? { ...item, value: true } : undefined;
    //     }

    //     const selectedOption = dataElement?.options?.find(({ id }) => item.value === id);
    //     const value = selectedOption?.code ?? item.value;
    //     return { ...item, value };
    // };

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
}
