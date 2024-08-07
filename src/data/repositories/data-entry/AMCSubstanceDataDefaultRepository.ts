import _ from "lodash";
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
    SUBSTANCE_CONSUMPTION_CALCULATED_KEYS,
    SubstanceConsumptionCalculated,
    SubstanceConsumptionCalculatedKeys,
} from "../../../domain/entities/data-entry/amc/SubstanceConsumptionCalculated";
import { ImportStrategy } from "../../../domain/entities/data-entry/DataValuesSaveSummary";
import { logger } from "../../../utils/logger";

export const AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID = "q8aSKr17J5S";
const AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_ID = "eUmWZeKZNrg";
export const AMC_RAW_SUBSTANCE_CONSUMPTION_DATA_PROGRAM_STAGE_ID = "GuGDhDZUSBX";
const AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_STAGE_ID = "ekEXxadjL0e";

// TODO: Move logic to use case and entity instead of in repository which should be logic-less, just get/store the data.
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
        substanceIds: Id[],
        substanceIdsChunkSize: number,
        chunked?: boolean
    ): FutureData<RawSubstanceConsumptionData[] | undefined> {
        return Future.joinObj({
            rawSubstanceConsumptionProgram: this.getRawSubstanceConsumptionProgram(),
            substanceConsumptionDataEvents: this.getRawSubstanceConsumptionDataD2EventsByIds(
                orgUnitId,
                substanceIds,
                substanceIdsChunkSize,
                chunked
            ),
        }).map(({ rawSubstanceConsumptionProgram, substanceConsumptionDataEvents }) => {
            const programStageDataElements = rawSubstanceConsumptionProgram?.programStages.find(
                ({ id }) => AMC_RAW_SUBSTANCE_CONSUMPTION_DATA_PROGRAM_STAGE_ID === id
            )?.programStageDataElements;

            if (programStageDataElements) {
                return this.buildRawProductConsumptionData(programStageDataElements, substanceConsumptionDataEvents);
            }
        });
    }

    getAllRawSubstanceConsumptionDataByByPeriod(
        orgUnitId: Id,
        period: string
    ): FutureData<RawSubstanceConsumptionData[] | undefined> {
        return Future.joinObj({
            rawSubstanceConsumptionProgram: this.getRawSubstanceConsumptionProgram(),
            substanceConsumptionDataEvents: this.getAllD2EventsFromProgramByPeriod(
                orgUnitId,
                AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID,
                period
            ),
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

    getAllCalculatedSubstanceConsumptionDataByByPeriod(
        orgUnitId: Id,
        period: string
    ): FutureData<SubstanceConsumptionCalculated[] | undefined> {
        return Future.joinObj({
            calculatedConsumptionDataProgram: this.getCalculatedConsumptionDataProgram(),
            calculatedConsumptionDataEvents: this.getAllD2EventsFromProgramByPeriod(
                orgUnitId,
                AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_ID,
                period
            ),
        }).map(result => {
            const { calculatedConsumptionDataProgram, calculatedConsumptionDataEvents } = result;

            const programStageDataElements = calculatedConsumptionDataProgram?.programStages.find(
                ({ id }) => AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_STAGE_ID === id
            )?.programStageDataElements;

            if (programStageDataElements) {
                return this.buildCalculatedConsumptionData(programStageDataElements, calculatedConsumptionDataEvents);
            }
        });
    }

    // TODO: decouple TrackerPostResponse from DHIS2
    importCalculations(
        importStrategy: ImportStrategy,
        orgUnitId: Id,
        calculatedConsumptionSubstanceLevelData: SubstanceConsumptionCalculated[]
    ): FutureData<{ response: TrackerPostResponse; eventIdLineNoMap: { id: string; lineNo: number }[] }> {
        return this.getCalculatedConsumptionDataProgram().flatMap(calculatedConsumptionDataProgram => {
            const d2TrackerEvents = this.mapSubstanceConsumptionCalculatedToD2TrackerEvent(
                calculatedConsumptionSubstanceLevelData,
                calculatedConsumptionDataProgram,
                orgUnitId
            );

            if (d2TrackerEvents) {
                const eventIdLineNoMap: { id: string; lineNo: number }[] = d2TrackerEvents.map(d2TrackerEvent => ({
                    id: d2TrackerEvent.event,
                    lineNo: isNaN(parseInt(d2TrackerEvent.event)) ? 0 : parseInt(d2TrackerEvent.event),
                }));
                return importApiTracker(this.api, { events: d2TrackerEvents }, importStrategy).flatMap(response => {
                    return Future.success({
                        response,
                        eventIdLineNoMap,
                    });
                });
            } else {
                logger.error(`[${new Date().toISOString()}] Substance level data: there are no events to be created`);
                return Future.error("There are no events to be created");
            }
        });
    }

    deleteCalculatedSubstanceConsumptionDataById(calculatedConsumptionIds: Id[]): FutureData<TrackerPostResponse> {
        const d2EventsCalculatedConsumption: D2TrackerEvent[] = calculatedConsumptionIds.map(eventId => {
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
        return importApiTracker(this.api, { events: d2EventsCalculatedConsumption }, "DELETE").flatMap(response => {
            return Future.success(response);
        });
    }

    private mapSubstanceConsumptionCalculatedToD2TrackerEvent(
        substanceConsumptionCalculated: SubstanceConsumptionCalculated[],
        calculatedConsumptionDataProgram: D2Program | undefined,
        orgUnitId: Id
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
                                ? optionSet.options.find(
                                      option =>
                                          option.code === value ||
                                          option.code === value?.toString() ||
                                          option.name === value
                                  )?.code || ""
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
                        event: data.eventId ?? generateId(),
                        occurredAt: data.report_date,
                        status: "COMPLETED",
                        program: AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_ID,
                        programStage: AMC_CALCULATED_CONSUMPTION_DATA_PROGRAM_STAGE_ID,
                        orgUnit: orgUnitId,
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
        return substanceConsumptionDataEvents
            .map(substanceConsumptionDataEvent => {
                const consumptionData = substanceConsumptionDataEvent.dataValues.reduce((acc, dataValue: DataValue) => {
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
                }, {});

                if (Object.keys(consumptionData).length) {
                    return {
                        id: substanceConsumptionDataEvent.event,
                        report_date: substanceConsumptionDataEvent.occurredAt,
                        ...consumptionData,
                    };
                }
            })
            .filter(Boolean) as RawSubstanceConsumptionData[];
    }

    private buildCalculatedConsumptionData(
        calculatedSubstanceConsumptionDataElements: D2ProgramStageDataElement[],
        calculatedConsumptionDataEvents: D2TrackerEvent[]
    ): SubstanceConsumptionCalculated[] | undefined {
        return calculatedConsumptionDataEvents
            .map(calculatedConsumptionDataEvent => {
                const consumptionData = calculatedConsumptionDataEvent.dataValues.reduce(
                    (acc, dataValue: DataValue) => {
                        const programStageDataElement = calculatedSubstanceConsumptionDataElements.find(
                            ({ dataElement }) => dataElement.id === dataValue.dataElement
                        )?.dataElement;

                        if (
                            programStageDataElement &&
                            SUBSTANCE_CONSUMPTION_CALCULATED_KEYS.includes(programStageDataElement.code)
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
                    {}
                );

                if (Object.keys(consumptionData).length) {
                    return {
                        report_date: calculatedConsumptionDataEvent.occurredAt,
                        eventId: calculatedConsumptionDataEvent.event,
                        ...consumptionData,
                    };
                }
            })
            .filter(Boolean) as SubstanceConsumptionCalculated[];
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

    private getRawSubstanceConsumptionDataD2EventsByIds(
        orgUnitId: Id,
        substanceIds: Id[],
        substanceIdsChunkSize: number,
        chunked?: boolean
    ): FutureData<D2TrackerEvent[]> {
        if (chunked) {
            return this.getRawSubstanceConsumptionDataByEventsIdsChunked(
                orgUnitId,
                substanceIds,
                substanceIdsChunkSize
            );
        }
        return Future.fromPromise(this.getRawSubstanceConsumptionDataByEventsIdsAsync(orgUnitId, substanceIds)).map(
            d2Events => d2Events
        );
    }

    private getRawSubstanceConsumptionDataByEventsIdsChunked(
        orgUnitId: Id,
        substanceIds: Id[],
        substanceIdsChunkSize: number
    ): FutureData<D2TrackerEvent[]> {
        const chunkedSubstanceIds = _(substanceIds).chunk(substanceIdsChunkSize).value();

        return Future.sequential(
            chunkedSubstanceIds.flatMap(substanceIdsChunk => {
                const substanceIdsString = substanceIdsChunk.join(";");

                // TODO: change pageSize to skipPaging:true when new version of d2-api
                return apiToFuture(
                    this.api.tracker.events.get({
                        fields: eventFields,
                        program: AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID,
                        orgUnit: orgUnitId,
                        event: substanceIdsString,
                        pageSize: substanceIdsChunk.length,
                    })
                ).flatMap((eventsResponse: TrackerEventsResponse) => {
                    return Future.success(eventsResponse.instances);
                });
            })
        ).flatMap(listOfEvents => Future.success(_(listOfEvents).flatten().value()));
    }

    private async getRawSubstanceConsumptionDataByEventsIdsAsync(
        orgUnit: Id,
        eventsIds: Id[]
    ): Promise<D2TrackerEvent[]> {
        const d2TrackerEvents: D2TrackerEvent[] = [];
        const event = eventsIds.join(";");
        const pageSize = 250;
        const totalPages = Math.ceil(eventsIds.length / pageSize);
        let page = 1;
        let result;
        do {
            result = await this.getEventsFromProgramByPeriodOfPage({
                orgUnit,
                program: AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID,
                event,
                pageSize,
                page,
            });
            d2TrackerEvents.push(...result.instances);
            page++;
        } while (result.page < totalPages);

        return d2TrackerEvents;
    }

    private getAllD2EventsFromProgramByPeriod(
        orgUnitId: Id,
        programId: Id,
        period: string
    ): FutureData<D2TrackerEvent[]> {
        return Future.fromPromise(this.getEventsFromProgramByPeriodAsync(orgUnitId, programId, period)).map(
            d2Events => d2Events
        );
    }

    private async getEventsFromProgramByPeriodAsync(
        orgUnit: Id,
        programId: Id,
        period: string
    ): Promise<D2TrackerEvent[]> {
        const d2TrackerEvents: D2TrackerEvent[] = [];
        const totalPages = true;
        const occurredAfter = `${period}-01-01`;
        const occurredBefore = `${period}-12-31`;
        const pageSize = 250;
        let page = 1;
        let result;
        try {
            do {
                result = await this.getEventsFromProgramByPeriodOfPage({
                    orgUnit,
                    program: programId,
                    totalPages,
                    occurredAfter,
                    occurredBefore,
                    page,
                    pageSize,
                });
                if (!result.total) {
                    throw new Error(
                        `Error getting paginated events of program ${programId} in period ${period} and organisation ${orgUnit}`
                    );
                }
                d2TrackerEvents.push(...result.instances);
                page++;
            } while (result.page < Math.ceil((result.total as number) / pageSize));
            return d2TrackerEvents;
        } catch {
            return [];
        }
    }

    private getEventsFromProgramByPeriodOfPage(params: {
        orgUnit: Id;
        program: Id;
        page: number;
        pageSize: number;
        event?: string;
        totalPages?: boolean;
        occurredAfter?: string;
        occurredBefore?: string;
    }): Promise<TrackerEventsResponse> {
        return this.api.tracker.events
            .get({
                fields: eventFields,
                ...params,
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
