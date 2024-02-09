import {
    AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
    AMR_GLASS_AMC_TEA_PRODUCT_ID,
} from "../../../../../data/repositories/data-entry/AMCProductDataDefaultRepository";
import { logger } from "../../../../../utils/logger";
import { Future, FutureData } from "../../../../entities/Future";
import { GlassATCVersion } from "../../../../entities/GlassATC";
import { Id } from "../../../../entities/Ref";
import {
    Attributes,
    EventDataValue,
    ProductDataTrackedEntity,
    Event,
} from "../../../../entities/data-entry/amc/ProductDataTrackedEntity";
import {
    ProductRegisterProgramMetadata,
    ProgramStage,
    ProgramStageDataElement,
    ProgramTrackedEntityAttribute,
} from "../../../../entities/data-entry/amc/ProductRegisterProgram";
import {
    PRODUCT_REGISTRY_ATTRIBUTES_KEYS,
    ProductRegistryAttributes,
} from "../../../../entities/data-entry/amc/ProductRegistryAttributes";
import {
    RAW_PRODUCT_CONSUMPTION_KEYS,
    RawProductConsumption,
} from "../../../../entities/data-entry/amc/RawProductConsumption";
import { RawSubstanceConsumptionCalculated } from "../../../../entities/data-entry/amc/RawSubstanceConsumptionCalculated";
import { calculateConsumptionProductLevelData } from "./calculationConsumptionProductLevelData";

export function getConsumptionDataProductLevel(params: {
    orgUnitId: Id;
    period: string;
    productRegisterProgramMetadata: ProductRegisterProgramMetadata | undefined;
    productDataTrackedEntities: ProductDataTrackedEntity[];
    atcCurrentVersionData: GlassATCVersion;
    atcVersionKey: string;
}): FutureData<RawSubstanceConsumptionCalculated[]> {
    const {
        orgUnitId,
        period,
        productRegisterProgramMetadata,
        productDataTrackedEntities,
        atcCurrentVersionData,
        atcVersionKey,
    } = params;

    if (!productRegisterProgramMetadata) {
        logger.error(`Cannot find Product Register program metadata for orgUnitId ${orgUnitId} and period ${period}`);
        return Future.error(
            `Cannot find Product Register program metadata for orgUnitId ${orgUnitId} and period ${period}`
        );
    }

    const rawProductConsumptionStage = productRegisterProgramMetadata?.programStages.find(
        ({ id }) => id === AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID
    );

    if (!rawProductConsumptionStage) {
        logger.error(
            `Cannot find Raw Product Consumption program stage metadata for orgUnitId ${orgUnitId} and period ${period} with id ${AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID}`
        );
        return Future.error(
            `Cannot find Raw Product Consumption program stage metadata for orgUnitId ${orgUnitId} and period ${period} with id ${AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID}`
        );
    }

    const { productRegistryAttributes, rawProductConsumption } = getProductRegistryAttributesAndRawProductConsumption(
        productDataTrackedEntities,
        productRegisterProgramMetadata.programAttributes,
        rawProductConsumptionStage
    );

    const rawSubstanceConsumptionCalculatedData = calculateConsumptionProductLevelData(
        period,
        orgUnitId,
        productRegistryAttributes,
        rawProductConsumption,
        atcCurrentVersionData,
        atcVersionKey
    );
    return Future.success(rawSubstanceConsumptionCalculatedData);
}

function getProductRegistryAttributesAndRawProductConsumption(
    productDataTrackedEntities: ProductDataTrackedEntity[],
    productRegisterProgramAttributes: ProgramTrackedEntityAttribute[],
    rawProductConsumptionStage: ProgramStage
) {
    return productDataTrackedEntities.reduce(
        (
            acc: {
                productRegistryAttributes: ProductRegistryAttributes[];
                rawProductConsumption: RawProductConsumption[];
            },
            productDataTrackedEntity
        ) => {
            const productId = productDataTrackedEntity.attributes.find(
                ({ id }) => id === AMR_GLASS_AMC_TEA_PRODUCT_ID
            )?.value;
            if (!productId) {
                return acc;
            }

            return {
                productRegistryAttributes: [
                    ...acc.productRegistryAttributes,
                    getProductRegistryAttributes(productDataTrackedEntity.attributes, productRegisterProgramAttributes),
                ],
                rawProductConsumption: [
                    ...acc.rawProductConsumption,
                    ...getRawProductConsumption(productId, productDataTrackedEntity.events, rawProductConsumptionStage),
                ],
            };
        },
        {
            productRegistryAttributes: [],
            rawProductConsumption: [],
        }
    );
}

function getProductRegistryAttributes(
    attributes: Attributes[],
    programAttributes: ProgramTrackedEntityAttribute[]
): ProductRegistryAttributes {
    return programAttributes.reduce(
        (acc: ProductRegistryAttributes, programAttribute: ProgramTrackedEntityAttribute) => {
            const productAttribute: Attributes | undefined = attributes.find(
                attribute => attribute.id === programAttribute.id
            );

            if (productAttribute && PRODUCT_REGISTRY_ATTRIBUTES_KEYS.includes(programAttribute.code)) {
                switch (programAttribute.valueType) {
                    case "TEXT":
                        return {
                            ...acc,
                            [programAttribute.code]: programAttribute.optionSetValue
                                ? programAttribute.optionSet.options.find(
                                      option => option.code === productAttribute.value
                                  )?.name
                                : productAttribute.value,
                        };
                    case "NUMBER":
                    case "INTEGER":
                    case "INTEGER_POSITIVE":
                    case "INTEGER_ZERO_OR_POSITIVE":
                        return {
                            ...acc,
                            [programAttribute.code]: programAttribute.optionSetValue
                                ? programAttribute.optionSet.options.find(
                                      option => option.code === productAttribute.value
                                  )?.name
                                : parseFloat(productAttribute.value),
                        };
                    default:
                        return {
                            ...acc,
                            [programAttribute.code]: productAttribute.value,
                        };
                }
            }
            return acc;
        },
        {} as ProductRegistryAttributes
    );
}

function getRawProductConsumption(
    productId: string,
    events: Event[],
    programStage: ProgramStage
): RawProductConsumption[] {
    return events
        .map(event => {
            const consumptionData = event.dataValues.reduce((acc, eventDataValue: EventDataValue) => {
                const programStageDataElement: ProgramStageDataElement | undefined = programStage.dataElements.find(
                    dataElement => dataElement.id === eventDataValue.id
                );
                if (programStageDataElement && RAW_PRODUCT_CONSUMPTION_KEYS.includes(programStageDataElement.code)) {
                    switch (programStageDataElement.valueType) {
                        case "TEXT":
                            return {
                                ...acc,
                                [programStageDataElement.code]: programStageDataElement.optionSetValue
                                    ? programStageDataElement.optionSet.options.find(
                                          option => option.code === eventDataValue.value
                                      )?.name
                                    : eventDataValue.value,
                            };
                        case "NUMBER":
                        case "INTEGER":
                        case "INTEGER_POSITIVE":
                        case "INTEGER_ZERO_OR_POSITIVE":
                            return {
                                ...acc,
                                [programStageDataElement.code]: programStageDataElement.optionSetValue
                                    ? programStageDataElement.optionSet.options.find(
                                          option => option.code === eventDataValue.value
                                      )?.name
                                    : parseFloat(eventDataValue.value),
                            };
                        default:
                            return {
                                ...acc,
                                [programStageDataElement.code]: eventDataValue.value,
                            };
                    }
                }
                return acc;
            }, {});
            if (Object.keys(consumptionData).length) {
                return {
                    ...consumptionData,
                    AMR_GLASS_AMC_TEA_PRODUCT_ID: productId,
                };
            }
        })
        .filter(Boolean) as RawProductConsumption[];
}
