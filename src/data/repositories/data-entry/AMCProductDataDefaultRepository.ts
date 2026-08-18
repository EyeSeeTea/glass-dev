import _ from "lodash";
import { D2Api, MetadataPick, SelectedPick } from "@eyeseetea/d2-api/2.34";
import { Future, FutureData } from "../../../domain/entities/Future";
import { SpreadsheetXlsxDataSource } from "../SpreadsheetXlsxDefaultRepository";
import { Spreadsheet, Row } from "../../../domain/repositories/SpreadsheetXlsxRepository";
import i18n from "../../../locales";
import { D2TrackerTrackedEntitySchema, TrackedEntitiesGetResponse } from "@eyeseetea/d2-api/api/trackerTrackedEntities";
import { Id } from "../../../domain/entities/Ref";
import {
    Attributes,
    Event,
    EventDataValue,
    ProductDataTrackedEntity,
} from "../../../domain/entities/data-entry/amc/ProductDataTrackedEntity";
import {
    ProductRegisterProgramMetadata,
    ProgramStage,
} from "../../../domain/entities/data-entry/amc/ProductRegisterProgram";
import { apiToFuture } from "../../../utils/futures";
import { AMCProductDataRepository } from "../../../domain/repositories/data-entry/AMCProductDataRepository";
import { D2TrackerEvent, DataValue } from "@eyeseetea/d2-api/api/trackerEvents";
import {
    RawSubstanceConsumptionCalculated,
    RawSubstanceConsumptionCalculatedKeys,
} from "../../../domain/entities/data-entry/amc/RawSubstanceConsumptionCalculated";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import {
    getDefaultErrorTrackerPostResponse,
    importApiTracker,
    joinAllTrackerPostResponses,
} from "../utils/importApiTracker";
import { logger } from "../../../utils/logger";
import moment from "moment";
import { ConsistencyError, ImportStrategy } from "../../../domain/entities/data-entry/ImportSummary";
import consoleLogger from "../../../utils/consoleLogger";
import { TrackerEvent } from "../../../domain/entities/TrackedEntityInstance";

export const AMC_PRODUCT_REGISTER_PROGRAM_ID = "G6ChA5zMW9n";

export const AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID = "GmElQHKXLIE";
export const AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID = "q8cl5qllyjd";

export const AMR_GLASS_AMC_TEA_PRODUCT_ID = "iasfoeU8veF";

const DEFAULT_IMPORT_DELETE_CALCULATIONS_CHUNK_SIZE = 300;

// TODO: Move logic to use case and entity instead of in repository which should be logic-less, just get/store the data.
export class AMCProductDataDefaultRepository implements AMCProductDataRepository {
    constructor(private api: D2Api) {}

    validate(
        file: File,
        rawProductDataColumns: string[],
        teiDataColumns: string[]
    ): FutureData<{ isValid: boolean; rows: number; specimens: string[] }> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const teiSheet = spreadsheet.sheets[0]; //First sheet is tracked entity instance data
            const teiHeaderRow = teiSheet?.rows[0]; //The second row has header details for AMC template.

            const rawProductSheet = spreadsheet.sheets[1]; //Second sheet is raw product level data
            const rawProductHeaderRow = rawProductSheet?.rows[0];

            if (rawProductHeaderRow && teiHeaderRow) {
                const sanitizedRawProductHeaders = Object.values(rawProductHeaderRow).map(header =>
                    String(header).replace(/[* \n\r]/g, "")
                );
                const allRawProductCols = rawProductDataColumns.map(col => sanitizedRawProductHeaders.includes(col));
                const allRawProductColsPresent = _.every(allRawProductCols, c => c === true);

                const sanitizedTEIHeaders = Object.values(teiHeaderRow).map(header =>
                    String(header).replace(/[* \n\r]/g, "")
                );
                const allTEICols = teiDataColumns.map(col => sanitizedTEIHeaders.includes(col));
                const allTEIColsPresent = _.every(allTEICols, c => c === true);

                return {
                    isValid: allRawProductColsPresent && allTEIColsPresent ? true : false,
                    rows: teiSheet.rows.length - 1, //one row for header
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

    validateFileBuffer(
        fileArrayBuffer: ArrayBuffer,
        rawProductDataColumns: string[],
        teiDataColumns: string[]
    ): FutureData<{ isValid: boolean; rows: number; specimens: string[] }> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().readFromArrayBuffer(fileArrayBuffer)).map(
            spreadsheet => {
                const teiSheet = spreadsheet.sheets[0]; //First sheet is tracked entity instance data
                const teiHeaderRow = teiSheet?.rows[0]; //The second row has header details for AMC template.

                const rawProductSheet = spreadsheet.sheets[1]; //Second sheet is raw product level data
                const rawProductHeaderRow = rawProductSheet?.rows[0];

                if (rawProductHeaderRow && teiHeaderRow) {
                    const sanitizedRawProductHeaders = Object.values(rawProductHeaderRow).map(header =>
                        String(header).replace(/[* \n\r]/g, "")
                    );
                    const allRawProductCols = rawProductDataColumns.map(col =>
                        sanitizedRawProductHeaders.includes(col)
                    );
                    const allRawProductColsPresent = _.every(allRawProductCols, c => c === true);

                    const sanitizedTEIHeaders = Object.values(teiHeaderRow).map(header =>
                        String(header).replace(/[* \n\r]/g, "")
                    );
                    const allTEICols = teiDataColumns.map(col => sanitizedTEIHeaders.includes(col));
                    const allTEIColsPresent = _.every(allTEICols, c => c === true);

                    return {
                        isValid: allRawProductColsPresent && allTEIColsPresent ? true : false,
                        rows: teiSheet.rows.length - 1, //one row for header
                        specimens: [],
                    };
                } else
                    return {
                        isValid: false,
                        rows: 0,
                        specimens: [],
                    };
            }
        );
    }

    checkTeiIdIntegrity(file: File): FutureData<ConsistencyError[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet =>
            this.getTeiIdIntegrityErrors(spreadsheet)
        );
    }

    checkTeiIdIntegrityFromArrayBuffer(fileArrayBuffer: ArrayBuffer): FutureData<ConsistencyError[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().readFromArrayBuffer(fileArrayBuffer)).map(
            spreadsheet => this.getTeiIdIntegrityErrors(spreadsheet)
        );
    }

    // Validates the TEIid linking key between the "TEI Instances" tab (sheet[0]) and the "Raw Product
    // Consumption" tab (sheet[1]) on the RAW spreadsheet, before template parsing. The template parser
    // silently repairs/drops the problems this catches: a blank product TEIid gets a random UID
    // auto-assigned (orphaning it, since no consumption row can ever match a value it doesn't have),
    // and a consumption row with a blank or unmatched TEIId is dropped outright — neither surfaces as
    // an error downstream, so this must read the sheets directly rather than the parsed entities.
    private getTeiIdIntegrityErrors(spreadsheet: Spreadsheet): ConsistencyError[] {
        const teiSheet = spreadsheet.sheets[0]; // TEI Instances
        const productSheet = spreadsheet.sheets[1]; // Raw Product Consumption
        const teiHeaderRow = teiSheet?.rows[0];
        const productHeaderRow = productSheet?.rows[0];
        // A missing sheet/header row is already reported by validate()/validateFileBuffer(); nothing
        // further to check here.
        if (!teiSheet || !productSheet || !teiHeaderRow || !productHeaderRow) return [];

        const sanitize = (value: unknown): string => String(value ?? "").replace(/[* \n\r]/g, "");
        const findColumnKey = (headerRow: Row<string>, headerName: string): string | undefined =>
            Object.entries(headerRow).find(([, value]) => sanitize(value) === headerName)?.[0];

        // Column header casing differs between the two tabs in the real template ("TEIid" vs "TEIId").
        const teiIdKey = findColumnKey(teiHeaderRow, "TEIid");
        const productTeiIdKey = findColumnKey(productHeaderRow, "TEIId");
        // A missing TEIid/TEIId column entirely is already reported by validate()/validateFileBuffer().
        if (!teiIdKey || !productTeiIdKey) return [];

        // rows[0] is the header row; data starts at rows[1]. "line" here is the 1-based data-row number
        // (row 1 = first product/consumption row after the header), for a readable error message.
        const teiRows = teiSheet.rows.slice(1).map((row, i) => ({ id: sanitize(row[teiIdKey]), line: i + 1 }));
        const productRows = productSheet.rows
            .slice(1)
            .map((row, i) => ({ id: sanitize(row[productTeiIdKey]), line: i + 1 }));

        const errors: ConsistencyError[] = [];

        // 1. Blank TEIid in TEI Instances.
        const blankTeiRows = teiRows.filter(r => !r.id);
        if (blankTeiRows.length > 0) {
            errors.push({
                error: i18n.t('TEI Instances tab: rows with a blank "TEIid"'),
                lines: blankTeiRows.map(r => r.line),
                count: blankTeiRows.length,
            });
        }

        // 2. Duplicate TEIid within TEI Instances.
        const duplicateTeiIdGroups = _(teiRows)
            .filter(r => !!r.id)
            .groupBy("id")
            .pickBy(group => group.length > 1)
            .value();
        Object.entries(duplicateTeiIdGroups).forEach(([id, group]) => {
            errors.push({
                error: i18n.t(`TEI Instances tab: duplicate "TEIid" value "${id}"`),
                lines: group.map(r => r.line),
                count: group.length,
            });
        });

        // 3. Blank TEIId in Raw Product Consumption.
        const blankProductRows = productRows.filter(r => !r.id);
        if (blankProductRows.length > 0) {
            errors.push({
                error: i18n.t('Raw Product Consumption tab: rows with a blank "TEIId"'),
                lines: blankProductRows.map(r => r.line),
                count: blankProductRows.length,
            });
        }

        // 4. TEIId in Raw Product Consumption that does not exist in TEI Instances.
        const validTeiIds = new Set(teiRows.filter(r => !!r.id).map(r => r.id));
        const orphanGroups = _(productRows)
            .filter(r => !!r.id && !validTeiIds.has(r.id))
            .groupBy("id")
            .value();
        Object.entries(orphanGroups).forEach(([id, group]) => {
            errors.push({
                error: i18n.t(`Raw Product Consumption tab: "TEIId" "${id}" does not exist in the TEI Instances tab`),
                lines: group.map(r => r.line),
                count: group.length,
            });
        });

        return errors;
    }

    // TODO: decouple TrackerPostResponse from DHIS2
    importCalculations(params: {
        importStrategy: ImportStrategy;
        productDataTrackedEntities: ProductDataTrackedEntity[];
        rawSubstanceConsumptionCalculatedStageMetadata: ProgramStage;
        rawSubstanceConsumptionCalculatedData: RawSubstanceConsumptionCalculated[];
        orgUnitId: Id;
        period: string;
        chunkSize?: number;
    }): FutureData<TrackerPostResponse> {
        const {
            importStrategy,
            productDataTrackedEntities,
            rawSubstanceConsumptionCalculatedStageMetadata,
            rawSubstanceConsumptionCalculatedData,
            orgUnitId,
            period,
            chunkSize = DEFAULT_IMPORT_DELETE_CALCULATIONS_CHUNK_SIZE,
        } = params;

        const d2TrackerEvents = this.mapRawSubstanceConsumptionCalculatedToD2TrackerEvent(
            productDataTrackedEntities,
            rawSubstanceConsumptionCalculatedStageMetadata,
            rawSubstanceConsumptionCalculatedData,
            orgUnitId,
            period
        );
        if (!_.isEmpty(d2TrackerEvents)) {
            const chunkedD2TrackerEvents = _(d2TrackerEvents).chunk(chunkSize).value();

            const $importTrackerEvents = chunkedD2TrackerEvents.map((d2TrackerEventsChunk, index) => {
                logger.debug(
                    `[${new Date().toISOString()}] Product level data: Chunk ${index + 1}/${
                        chunkedD2TrackerEvents.length
                    } of Raw Substance Consumption Calculated.`
                );

                return importApiTracker(
                    this.api,
                    { events: d2TrackerEventsChunk },
                    { action: importStrategy, async: true }
                )
                    .mapError(error => {
                        logger.error(
                            `[${new Date().toISOString()}] Product level data: Error importing Raw Substance Consumption Calculated: ${error}`
                        );

                        return getDefaultErrorTrackerPostResponse(error);
                    })
                    .flatMap(response => {
                        logger.debug(
                            `[${new Date().toISOString()}] Product level data: End of chunk ${index + 1}/${
                                chunkedD2TrackerEvents.length
                            } of Raw Substance Consumption Calculated.`
                        );
                        return Future.success(response);
                    });
            });

            return Future.sequentialWithAccumulation($importTrackerEvents, {
                stopOnError: true,
            })
                .flatMap(result => {
                    if (result.type === "error") {
                        const errorTrackerPostResponse = result.error;
                        const messageError = errorTrackerPostResponse.message;
                        logger.error(
                            `[${new Date().toISOString()}] Product level data: Error importing some Raw Substance Consumption Calculated: ${messageError}`
                        );
                        const accumulatedTrackerPostResponses = result.data;
                        const trackerPostResponse = joinAllTrackerPostResponses([
                            ...accumulatedTrackerPostResponses,
                            errorTrackerPostResponse,
                        ]);
                        return Future.success(trackerPostResponse);
                    } else {
                        logger.debug(
                            `[${new Date().toISOString()}] Product level data: All chunks of Raw Substance Consumption Calculated imported.`
                        );
                        const trackerPostResponse = joinAllTrackerPostResponses(result.data);
                        return Future.success(trackerPostResponse);
                    }
                })
                .mapError(() => {
                    logger.error(
                        `[${new Date().toISOString()}] Product level data: Unknown error while saving Raw Substance Consumption Calculated in chunks.`
                    );
                    return `[${new Date().toISOString()}] Product level data: Unknown error while saving Raw Substance Consumption Calculated in chunks.`;
                });
        } else {
            logger.error(`[${new Date().toISOString()}] Product level data: there are no events to be created`);
            return Future.error("Product level data: There are no events to be created");
        }
    }

    deleteRawSubstanceConsumptionCalculatedById(
        rawSubstanceConsumptionCalculatedIds: Id[],
        chunkSize: number = DEFAULT_IMPORT_DELETE_CALCULATIONS_CHUNK_SIZE
    ): FutureData<TrackerPostResponse> {
        const d2TrackerEventsToDelete: TrackerEvent[] = rawSubstanceConsumptionCalculatedIds.map(eventId => {
            return {
                event: eventId,
                program: "",
                status: "COMPLETED",
                orgUnit: "",
                occurredAt: "",
                attributeOptionCombo: "",
                dataValues: [],
                programStage: "",
                scheduledAt: "",
            };
        });

        const chunkedD2TrackerEventsToDelete = _(d2TrackerEventsToDelete).chunk(chunkSize).value();

        const $deleteTrackerEvents = chunkedD2TrackerEventsToDelete.map((d2TrackerEventsToDeleteChunk, index) => {
            consoleLogger.debug(
                `[${new Date().toISOString()}] Chunk ${index + 1}/${
                    chunkedD2TrackerEventsToDelete.length
                } of Raw Substance Consumption Calculated.`
            );

            return importApiTracker(
                this.api,
                { events: d2TrackerEventsToDeleteChunk },
                { action: "DELETE", async: true }
            )
                .mapError(error => {
                    consoleLogger.error(
                        `[${new Date().toISOString()}] Error deleting Raw Substance Consumption Calculated: ${error}`
                    );
                    return getDefaultErrorTrackerPostResponse(error);
                })
                .flatMap(response => {
                    consoleLogger.debug(
                        `[${new Date().toISOString()}] End of chunk ${index + 1}/${
                            chunkedD2TrackerEventsToDelete.length
                        } of Raw Substance Consumption Calculated.`
                    );

                    return Future.success(response);
                });
        });

        return Future.sequentialWithAccumulation($deleteTrackerEvents, {
            stopOnError: true,
        })
            .flatMap(result => {
                if (result.type === "error") {
                    const errorTrackerPostResponse = result.error;
                    const messageError = errorTrackerPostResponse.message;
                    logger.error(
                        `[${new Date().toISOString()}] Error deleting some Raw Substance Consumption Calculated: ${messageError}`
                    );
                    const accumulatedTrackerPostResponses = result.data;
                    const trackerPostResponse = joinAllTrackerPostResponses([
                        ...accumulatedTrackerPostResponses,
                        errorTrackerPostResponse,
                    ]);
                    return Future.success(trackerPostResponse);
                } else {
                    logger.debug(
                        `[${new Date().toISOString()}] All chunks of Raw Substance Consumption Calculated deleted.`
                    );
                    const trackerPostResponse = joinAllTrackerPostResponses(result.data);
                    return Future.success(trackerPostResponse);
                }
            })
            .mapError(() => {
                logger.error(
                    `[${new Date().toISOString()}] Unknown error while deleting Raw Substance Consumption Calculated in chunks.`
                );
                return `[${new Date().toISOString()}] Unknown error while deleting Raw Substance Consumption Calculated in chunks.`;
            });
    }

    getProductRegisterAndRawProductConsumptionByProductIds(
        orgUnitId: Id,
        productIds: Id[],
        period: string,
        productIdsChunkSize: number,
        chunked?: boolean
    ): FutureData<ProductDataTrackedEntity[]> {
        if (chunked) {
            return this.getProductRegisterAndRawProductConsumptionByProductIdsChunked(
                orgUnitId,
                productIds,
                period,
                productIdsChunkSize
            );
        }
        return Future.fromPromise(
            this.getProductRegisterAndRawProductConsumptionByProductIdsAsync(orgUnitId, productIds, period)
        ).map(trackedEntities => {
            return this.mapFromTrackedEntitiesToProductData(trackedEntities);
        });
    }

    getAllProductRegisterAndRawProductConsumptionByPeriod(
        orgUnitId: Id,
        period: string
    ): FutureData<ProductDataTrackedEntity[]> {
        return Future.fromPromise(
            this.getAllProductRegisterAndRawProductConsumptionByPeriodAsync(orgUnitId, period)
        ).map(trackedEntities => {
            return this.mapFromTrackedEntitiesToProductData(trackedEntities);
        });
    }

    getProductRegisterProgramMetadata(): FutureData<ProductRegisterProgramMetadata | undefined> {
        return apiToFuture(
            this.api.models.programs.get({
                fields: programFields,
                filter: { id: { eq: AMC_PRODUCT_REGISTER_PROGRAM_ID } },
            })
        ).map(response => {
            return this.mapFromD2ProgramToProductRegisterProgramMetadata(response.objects[0]);
        });
    }

    private getProductRegisterAndRawProductConsumptionByProductIdsChunked(
        orgUnit: Id,
        productIds: string[],
        period: string,
        productIdsChunkSize: number
    ): FutureData<ProductDataTrackedEntity[]> {
        const chunkedProductIds = _(productIds).chunk(productIdsChunkSize).value();
        const enrollmentEnrolledAfter = `${period}-1-1`;
        const enrollmentEnrolledBefore = `${period}-12-31`;

        return Future.sequential(
            chunkedProductIds.flatMap(productIdsChunk => {
                const productIdsString = productIdsChunk.join(";");

                // TODO: change pageSize to skipPaging:true when new version of d2-api
                return apiToFuture(
                    this.api.tracker.trackedEntities.get({
                        fields: trackedEntitiesFields,
                        program: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                        programStage: AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
                        orgUnit: orgUnit,
                        trackedEntity: productIdsString,
                        enrollmentEnrolledAfter: enrollmentEnrolledAfter,
                        enrollmentEnrolledBefore: enrollmentEnrolledBefore,
                        pageSize: productIdsChunk.length,
                        ouMode: "SELECTED",
                    })
                ).flatMap(trackedEntitiesResponse => {
                    const d2TrackerEntities: D2TrackerEntity[] = trackedEntitiesResponse.instances;
                    const productData = this.mapFromTrackedEntitiesToProductData(d2TrackerEntities);
                    return Future.success(productData);
                });
            })
        ).flatMap(listOfProductData => Future.success(_(listOfProductData).flatten().value()));
    }

    private async getProductRegisterAndRawProductConsumptionByProductIdsAsync(
        orgUnit: Id,
        productIds: string[],
        period: string
    ): Promise<D2TrackerEntity[]> {
        const trackedEntities: D2TrackerEntity[] = [];
        const pageSize = 250;
        const totalPages = Math.ceil(productIds.length / pageSize);
        let page = 1;
        let result;
        const productIdsString = productIds.join(";");
        const enrollmentEnrolledAfter = `${period}-1-1`;
        const enrollmentEnrolledBefore = `${period}-12-31`;

        do {
            result = await this.getTrackedEntitiesOfPage({
                orgUnit,
                trackedEntity: productIdsString,
                page,
                pageSize,
                enrollmentEnrolledBefore,
                enrollmentEnrolledAfter,
            });
            trackedEntities.push(...result.instances);
            page++;
        } while (result.page < totalPages);

        return trackedEntities;
    }

    private async getAllProductRegisterAndRawProductConsumptionByPeriodAsync(
        orgUnit: Id,
        period: string
    ): Promise<D2TrackerEntity[]> {
        const trackedEntities: D2TrackerEntity[] = [];
        const enrollmentEnrolledAfter = `${period}-1-1`;
        const enrollmentEnrolledBefore = `${period}-12-31`;
        const totalPages = true;
        const pageSize = 250;
        let page = 1;
        let result;

        try {
            do {
                result = await this.getTrackedEntitiesOfPage({
                    orgUnit,
                    page,
                    pageSize,
                    totalPages,
                    enrollmentEnrolledBefore,
                    enrollmentEnrolledAfter,
                });
                if (!result.total) {
                    throw new Error(
                        `Error getting paginated tracked entities of period ${period} and organisation ${orgUnit}`
                    );
                }
                trackedEntities.push(...result.instances);
                page++;
            } while (result.page < Math.ceil((result.total as number) / pageSize));
            return trackedEntities;
        } catch {
            return [];
        }
    }

    private getTrackedEntitiesOfPage(params: {
        orgUnit: Id;
        page: number;
        pageSize: number;
        trackedEntity?: string;
        totalPages?: boolean;
        enrollmentEnrolledAfter?: string;
        enrollmentEnrolledBefore?: string;
    }): Promise<TrackedEntitiesGetResponse<typeof trackedEntitiesFields>> {
        return this.api.tracker.trackedEntities
            .get({
                fields: trackedEntitiesFields,
                program: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                programStage: AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
                ouMode: "SELECTED",
                ...params,
            })
            .getData();
    }

    public getTrackedEntityProductIdsByOUAndPeriod(orgUnitId: Id, period: string): FutureData<string[]> {
        return Future.fromPromise(
            this.getAllProductRegisterAndRawProductConsumptionByPeriodAsync(orgUnitId, period)
        ).map(trackedEntities => {
            const productsIds = trackedEntities.map(trackedEntity => {
                return trackedEntity.attributes?.find(attribute => attribute.attribute === AMR_GLASS_AMC_TEA_PRODUCT_ID)
                    ?.value;
            });

            return _(productsIds).compact().value();
        });
    }

    private mapFromD2ProgramToProductRegisterProgramMetadata(
        program: D2Program | undefined
    ): ProductRegisterProgramMetadata | undefined {
        if (program) {
            const programStages: ProgramStage[] = program.programStages.map(programStage => {
                return {
                    id: programStage.id,
                    name: programStage.name,
                    dataElements: programStage?.programStageDataElements.map(({ dataElement }) => {
                        return {
                            id: dataElement.id,
                            code: dataElement.code,
                            valueType: dataElement.valueType,
                            optionSetValue: dataElement.optionSetValue,
                            optionSet: dataElement.optionSet,
                        };
                    }),
                };
            });
            return {
                programStages,
                programAttributes: program.programTrackedEntityAttributes.map(atr => atr.trackedEntityAttribute),
            };
        }
    }

    private mapFromTrackedEntitiesToProductData(trackedEntities: D2TrackerEntity[]): ProductDataTrackedEntity[] {
        return trackedEntities
            .map(trackedEntity => {
                if (trackedEntity.enrollments && trackedEntity.enrollments[0] && trackedEntity.attributes) {
                    const events: Event[] = trackedEntity.enrollments[0].events.map(event => {
                        const dataValues = event.dataValues.map(({ dataElement, value }) => ({
                            id: dataElement,
                            value,
                        })) as EventDataValue[];
                        return {
                            eventId: event.event ?? "",
                            occurredAt: event.occurredAt,
                            dataValues,
                        };
                    });

                    return {
                        trackedEntityId: trackedEntity.trackedEntity,
                        enrollmentId: trackedEntity.enrollments[0].enrollment,
                        enrollmentStatus: trackedEntity.enrollments[0].status,
                        enrolledAt: trackedEntity.enrollments[0].enrolledAt,
                        events: events,
                        attributes: trackedEntity.attributes.map(({ attribute, valueType, value }) => ({
                            id: attribute,
                            valueType: valueType as string,
                            value,
                        })) as Attributes[],
                    };
                }
            })
            .filter(Boolean) as ProductDataTrackedEntity[];
    }

    private mapRawSubstanceConsumptionCalculatedToD2TrackerEvent(
        productDataTrackedEntities: ProductDataTrackedEntity[],
        rawSubstanceConsumptionCalculatedStageMetadata: ProgramStage,
        rawSubstanceConsumptionCalculatedData: RawSubstanceConsumptionCalculated[],
        orgUnitId: Id,
        period: string
    ): D2TrackerEvent[] {
        return rawSubstanceConsumptionCalculatedData
            .map(data => {
                const productId = data.AMR_GLASS_AMC_TEA_PRODUCT_ID;
                const productDataTrackedEntity = productDataTrackedEntities.find(productDataTrackedEntity => {
                    const enrolledYear = new Date(productDataTrackedEntity.enrolledAt).getFullYear();
                    return (
                        productDataTrackedEntity.attributes.some(attribute => attribute.value === productId) &&
                        enrolledYear === Number(period)
                    );
                });

                if (productDataTrackedEntity) {
                    const dataValues: DataValue[] = rawSubstanceConsumptionCalculatedStageMetadata.dataElements.map(
                        ({ id, code, valueType, optionSetValue, optionSet }) => {
                            const value = data[code.trim() as RawSubstanceConsumptionCalculatedKeys];
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
                                updatedAt: "",
                                storedBy: "",
                                createdAt: "",
                            };
                        }
                    );

                    //Validation rule : Set to 1st Jan of corresponding year
                    const occurredAt = data.eventId
                        ? productDataTrackedEntity.events.find(({ eventId }) => eventId === data.eventId)?.occurredAt
                        : moment(new Date(`${period}-01-01`))
                              .toISOString()
                              .split("T")
                              .at(0);

                    return {
                        event: data.eventId ?? "",
                        occurredAt: occurredAt,
                        status: "COMPLETED",
                        trackedEntity: productDataTrackedEntity.trackedEntityId,
                        enrollment: productDataTrackedEntity.enrollmentId,
                        enrollmentStatus: data.eventId ? productDataTrackedEntity.enrollmentStatus : "ACTIVE",
                        program: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                        programStage: AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID,
                        orgUnit: orgUnitId,
                        dataValues,
                    };
                }
            })
            .filter(Boolean) as D2TrackerEvent[];
    }
}

const trackedEntitiesFields = {
    trackedEntity: true,
    enrollments: {
        enrollment: true,
        status: true,
        enrolledAt: true,
        events: {
            event: true,
            occurredAt: true,
            dataValues: {
                dataElement: true,
                value: true,
            },
        },
    },
    attributes: {
        attribute: true,
        valueType: true,
        value: true,
    },
} as const;

type D2TrackerEntity = SelectedPick<D2TrackerTrackedEntitySchema, typeof trackedEntitiesFields>;

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
    programTrackedEntityAttributes: {
        trackedEntityAttribute: {
            id: true,
            code: true,
            valueType: true,
            optionSetValue: true,
            optionSet: { options: { name: true, code: true } },
        },
    },
} as const;

type D2Program = MetadataPick<{
    programs: { fields: typeof programFields };
}>["programs"][number];
