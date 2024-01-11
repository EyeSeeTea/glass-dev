import { D2Api, D2Program, D2ProgramStageDataElement } from "@eyeseetea/d2-api/2.34";
import { Future, FutureData } from "../../../domain/entities/Future";
import { Id, generateId } from "../../../domain/entities/Ref";
import { AMCSubstanceDataRepository } from "../../../domain/repositories/data-entry/AMCSubstanceDataRepository";
import { SpreadsheetXlsxDataSource } from "../SpreadsheetXlsxDefaultRepository";
import { D2TrackerEvent, DataValue, TrackerEventsResponse } from "@eyeseetea/d2-api/api/trackerEvents";
import { apiToFuture } from "../../../utils/futures";
import {
    RAW_SUBSTANCE_CONSUMPTION_DATA_KEYS,
    RawSubstanceConsumptionData,
} from "../../../domain/entities/data-entry/amc/RawSubstanceConsumptionData";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { importApiTracker } from "../utils/importApiTracker";
import {
    SubstanceConsumptionCalculated,
    SubstanceConsumptionCalculatedKeys,
} from "../../../domain/entities/data-entry/amc/SubstanceConsumptionCalculated";

export const AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID = "q8aSKr17J5S";
const AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_ID = "eUmWZeKZNrg";
export const AMC_RAW_SUBSTANCE_CONSUMPTION_DATA_PROGRAM_STAGE_ID = "GuGDhDZUSBX";
const AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_STAGE_ID = "ekEXxadjL0e";
const TRACKER_IMPORT_STRATEGY_CREATE_AND_UPDATE = "CREATE_AND_UPDATE";

export class AMCSubstanceDataDefaultRepository implements AMCSubstanceDataRepository {
    constructor(private api: D2Api) {}

    validate(
        file: File,
        rawSubstanceDataColumns: string[]
    ): FutureData<{ isValid: boolean; rows: number; specimens: string[] }> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const rawSubstanceSheet = spreadsheet.sheets[0];
            const rawSubstanceHeaderRow = rawSubstanceSheet?.rows[1];

            if (rawSubstanceHeaderRow) {
                const sanitizedRawSubstanceHeaders = Object.values(rawSubstanceHeaderRow).map(header =>
                    header.replace(/[* \n\r]/g, "")
                );
                const allRawSubstanceCols = rawSubstanceDataColumns.map(col =>
                    sanitizedRawSubstanceHeaders.includes(col)
                );
                const allRawSubstanceColsPresent = _.every(allRawSubstanceCols, c => c === true);

                return {
                    isValid: allRawSubstanceColsPresent ? true : false,
                    rows: rawSubstanceSheet.rows.length - 2, //two rows for header
                    specimens: [],
                };
            } else
                return {
                    isValid: false,
                    rows: 0,
                    specimens: [],
                };
        });
    }

    getRawSubstanceConsumptionDataByEventsIds(
        orgUnitId: Id,
        eventsIds: Id[]
    ): FutureData<RawSubstanceConsumptionData[] | undefined> {
        return Future.joinObj({
            rawSubstanceConsumptionProgram: this.getRawSubstanceConsumptionProgram(),
            substanceConsumptionDataEvents: this.getRawSubstanceConsumptionDataD2Events(orgUnitId, eventsIds),
        }).map(result => {
            const { rawSubstanceConsumptionProgram, substanceConsumptionDataEvents } = result as {
                rawSubstanceConsumptionProgram: D2Program | undefined;
                substanceConsumptionDataEvents: D2TrackerEvent[];
            };

            const programStageDataElements = rawSubstanceConsumptionProgram?.programStages.find(
                ({ id }) => AMC_RAW_SUBSTANCE_CONSUMPTION_DATA_PROGRAM_STAGE_ID === id
            )?.programStageDataElements;

            if (programStageDataElements) {
                return this.buildRawProductConsumptionData(programStageDataElements, substanceConsumptionDataEvents);
            }
        });
    }

    // TODO: decouple TrackerPostResponse from DHIS2
    importCalculations(
        orgUnitId: Id,
        orgUnitName: string,
        calculatedConsumptionSubstanceLevelData: SubstanceConsumptionCalculated[]
    ): FutureData<{ response: TrackerPostResponse; eventIdLineNoMap: { id: string; lineNo: number }[] }> {
        return this.getCalculatedConsumptionDataProgram().flatMap(calculatedConsumptionDataProgram => {
            const d2TrackerEvents = this.mapSubstanceConsumptionCalculatedToD2TrackerEvent(
                calculatedConsumptionSubstanceLevelData,
                calculatedConsumptionDataProgram,
                orgUnitId,
                orgUnitName
            );

            if (d2TrackerEvents) {
                const eventIdLineNoMap: { id: string; lineNo: number }[] = d2TrackerEvents.map(d2TrackerEvent => ({
                    id: d2TrackerEvent.event,
                    lineNo: isNaN(parseInt(d2TrackerEvent.event)) ? 0 : parseInt(d2TrackerEvent.event),
                }));
                return importApiTracker(
                    this.api,
                    { events: d2TrackerEvents },
                    TRACKER_IMPORT_STRATEGY_CREATE_AND_UPDATE
                ).flatMap(response => {
                    return Future.success({
                        response,
                        eventIdLineNoMap,
                    });
                });
            } else {
                return Future.error("There are no events to be created");
            }
        });
    }

    private mapSubstanceConsumptionCalculatedToD2TrackerEvent(
        substanceConsumptionCalculated: SubstanceConsumptionCalculated[],
        calculatedConsumptionDataProgram: D2Program | undefined,
        orgUnitId: Id,
        orgUnitName: string
    ): D2TrackerEvent[] | undefined {
        const programStageDataElements = calculatedConsumptionDataProgram?.programStages
            .find(({ id }) => AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_STAGE_ID === id)
            ?.programStageDataElements.map(({ dataElement }) => dataElement);

        if (programStageDataElements) {
            return substanceConsumptionCalculated
                .map(data => {
                    const dataValues: DataValue[] = programStageDataElements.map(
                        ({ id, code, valueType, optionSetValue, optionSet }) => {
                            const value = data[code.trim() as SubstanceConsumptionCalculatedKeys];
                            const dataValue = optionSetValue
                                ? optionSet.options.find(option => option.name === value || option.code === value)
                                      ?.code || ""
                                : (valueType === "NUMBER" ||
                                      valueType === "INTEGER" ||
                                      valueType === "INTEGER_POSITIVE" ||
                                      valueType === "INTEGER_ZERO_OR_POSITIVE") &&
                                  value === 0
                                ? value
                                : value || "";

                            return {
                                dataElement: id,
                                value: dataValue.toString(),
                            };
                        }
                    );

                    return {
                        event: generateId(),
                        occurredAt: data.report_date,
                        status: "COMPLETED",
                        program: AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_ID,
                        programStage: AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_STAGE_ID,
                        orgUnit: orgUnitId,
                        orgUnitName,
                        dataValues,
                    };
                })
                .filter(Boolean) as D2TrackerEvent[];
        }
    }

    private buildRawProductConsumptionData(
        rawSubstanceConsumptionDataElements: D2ProgramStageDataElement[],
        substanceConsumptionDataEvents: D2TrackerEvent[]
    ): RawSubstanceConsumptionData[] | undefined {
        return substanceConsumptionDataEvents.map(substanceConsumptionDataEvent => {
            return substanceConsumptionDataEvent.dataValues.reduce(
                (acc: RawSubstanceConsumptionData, dataValue: DataValue) => {
                    const programStageDataElement = rawSubstanceConsumptionDataElements.find(
                        ({ dataElement }) => dataElement.id === dataValue.dataElement
                    )?.dataElement;

                    if (
                        programStageDataElement &&
                        RAW_SUBSTANCE_CONSUMPTION_DATA_KEYS.includes(programStageDataElement.code)
                    ) {
                        switch (programStageDataElement.valueType) {
                            case "TEXT":
                                return {
                                    ...acc,
                                    [programStageDataElement.code]: dataValue.value,
                                };
                            case "NUMBER":
                            case "INTEGER":
                            case "INTEGER_POSITIVE":
                            case "INTEGER_ZERO_OR_POSITIVE":
                                return {
                                    ...acc,
                                    [programStageDataElement.code]: parseFloat(dataValue.value),
                                };
                            default:
                                return {
                                    ...acc,
                                    [programStageDataElement.code]: dataValue.value,
                                };
                        }
                    }
                    return acc;
                },
                { report_date: substanceConsumptionDataEvent.occurredAt } as RawSubstanceConsumptionData
            );
        });
    }

    private getRawSubstanceConsumptionProgram(): FutureData<D2Program | undefined> {
        return apiToFuture(
            this.api.models.programs.get({
                fields: programFields,
                filter: { id: { eq: AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID } },
            })
        ).map(response => response.objects[0] as D2Program | undefined);
    }

    private getCalculatedConsumptionDataProgram(): FutureData<D2Program | undefined> {
        return apiToFuture(
            this.api.models.programs.get({
                fields: programFields,
                filter: { id: { eq: AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_ID } },
            })
        ).map(response => response.objects[0] as D2Program | undefined);
    }

    private getRawSubstanceConsumptionDataD2Events(orgUnitId: Id, eventsIds: Id[]): FutureData<D2TrackerEvent[]> {
        return Future.fromPromise(this.getSubstanceConsumptionDataByEventsIdsAsync(orgUnitId, eventsIds)).map(
            d2Events => d2Events
        );
    }

    private async getSubstanceConsumptionDataByEventsIdsAsync(
        orgUnitId: Id,
        eventsIds: Id[]
    ): Promise<D2TrackerEvent[]> {
        const d2TrackerEvents: D2TrackerEvent[] = [];
        const pageSize = 250;
        const totalPages = Math.ceil(eventsIds.length / pageSize);
        let page = 1;
        let result;

        do {
            result = await this.getSubstanceConsumptionDataByEventsIdsOfPage(orgUnitId, eventsIds, page, pageSize);
            d2TrackerEvents.push(...result.instances);
            page++;
        } while (result.page < totalPages);

        return d2TrackerEvents;
    }

    private getSubstanceConsumptionDataByEventsIdsOfPage(
        orgUnitId: Id,
        eventsIds: Id[],
        page: number,
        pageSize: number
    ): Promise<TrackerEventsResponse> {
        const eventIdsString = eventsIds.join(";");
        return this.api.tracker.events
            .get({
                orgUnit: orgUnitId,
                fields: eventFields,
                program: AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID,
                event: eventIdsString,
                page,
                pageSize,
            })
            .getData();
    }
}

const programFields = {
    id: true,
    programStages: {
        id: true,
        name: true,
        programStageDataElements: {
            dataElement: {
                id: true,
                code: true,
                valueType: true,
                optionSetValue: true,
                optionSet: { options: { name: true, code: true } },
            },
        },
    },
} as const;

const eventFields = {
    event: true,
    dataValues: true,
    occurredAt: true,
} as const;
