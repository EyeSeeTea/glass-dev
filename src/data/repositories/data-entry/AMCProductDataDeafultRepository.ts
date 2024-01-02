import { D2Api, MetadataPick } from "@eyeseetea/d2-api/2.34";
import { Future, FutureData } from "../../../domain/entities/Future";
import { SpreadsheetXlsxDataSource } from "../SpreadsheetXlsxDefaultRepository";
import { D2TrackerTrackedEntity, TrackedEntitiesGetResponse } from "@eyeseetea/d2-api/api/trackerTrackedEntities";
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

export const AMC_PRODUCT_REGISTER_PROGRAM_ID = "G6ChA5zMW9n";

export const AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID = "GmElQHKXLIE";
export const AMC_RAW_SUBSTANCE_CONSUMPTION_CALCULATED_STAGE_ID = "q8cl5qllyjd";

export const AMR_GLASS_AMC_TEA_PRODUCT_ID = "iasfoeU8veF";

export class AMCProductDataDeafultRepository implements AMCProductDataRepository {
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
                    header.replace(/[* \n\r]/g, "")
                );
                const allRawProductCols = rawProductDataColumns.map(col => sanitizedRawProductHeaders.includes(col));
                const allRawProductColsPresent = _.every(allRawProductCols, c => c === true);

                const sanitizedTEIHeaders = Object.values(teiHeaderRow).map(header => header.replace(/[* \n\r]/g, ""));
                const allTEICols = teiDataColumns.map(col => sanitizedTEIHeaders.includes(col));
                const allTEIColsPresent = _.every(allTEICols, c => c === true);

                return {
                    isValid: allRawProductColsPresent && allTEIColsPresent ? true : false,
                    rows: rawProductSheet.rows.length - 2, //two rows for header
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

    getProductRegisterAndRawProductConsumptionByProductIds(
        orgUnitId: Id,
        productIds: string[]
    ): FutureData<ProductDataTrackedEntity[]> {
        return Future.fromPromise(
            this.getProductRegisterAndRawProductConsumptionByProductIdsAsync(orgUnitId, productIds)
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

    private getTrackedEntitiesByProductIdsOfPage(
        orgUnitId: Id,
        productIds: string[],
        page: number,
        pageSize: number
    ): Promise<TrackedEntitiesGetResponse> {
        const productIdsString = productIds.join(";");
        const filterStr = `${AMR_GLASS_AMC_TEA_PRODUCT_ID}:IN:${productIdsString}`;
        return this.api.tracker.trackedEntities
            .get({
                orgUnit: orgUnitId,
                fields: trackedEntitiesFields,
                program: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                programStage: AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
                page,
                pageSize,
                filter: filterStr,
            })
            .getData();
    }

    private async getProductRegisterAndRawProductConsumptionByProductIdsAsync(
        orgUnitId: Id,
        productIds: string[]
    ): Promise<D2TrackerTrackedEntity[]> {
        const trackedEntities: D2TrackerTrackedEntity[] = [];
        const pageSize = 250;
        const totalPages = Math.ceil(productIds.length / pageSize);
        let page = 1;
        let result;

        do {
            result = await this.getTrackedEntitiesByProductIdsOfPage(orgUnitId, productIds, page, pageSize);
            trackedEntities.push(...result.instances);
            page++;
        } while (result.page < totalPages);

        return trackedEntities;
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

    private mapFromTrackedEntitiesToProductData(trackedEntities: D2TrackerTrackedEntity[]): ProductDataTrackedEntity[] {
        return trackedEntities
            .map(trackedEntity => {
                if (trackedEntity.enrollments && trackedEntity.enrollments[0] && trackedEntity.attributes) {
                    const events: Event[] = trackedEntity.enrollments[0].events.map(eventDataValues => {
                        const dataValues = eventDataValues.dataValues.map(({ dataElement, value }) => ({
                            id: dataElement,
                            value,
                        })) as EventDataValue[];
                        return {
                            dataValues,
                        };
                    });

                    return {
                        trackedEntityId: trackedEntity.trackedEntity,
                        enrollmentId: trackedEntity.enrollments[0].enrollment,
                        events,
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
}

const trackedEntitiesFields = {
    trackedEntity: true,
    enrollments: {
        enrollment: true,
        events: {
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
