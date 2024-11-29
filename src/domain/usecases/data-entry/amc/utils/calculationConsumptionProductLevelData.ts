import { BatchLogContent, logger } from "../../../../../utils/logger";
import {
    ATCChangesData,
    ATCData,
    AmClassificationData,
    AwareClassificationData,
    CombinationsData,
    ConversionsIUToGramsData,
    DDDChangesData,
    DDDData,
    DEFAULT_SALT_CODE,
    GlassAtcVersionData,
    UnitsData,
    getATCChanges,
    getAmClass,
    getAtcCodeByLevel,
    getAwareClass,
    getDDDChanges,
    getNewAtcCode,
    getNewDddData,
    getStandardizedUnit,
    getStandardizedUnitsAndValue,
    isStrengthUnitValid,
} from "../../../../entities/GlassAtcVersionData";
import { Id } from "../../../../entities/Ref";
import { ProductRegistryAttributes } from "../../../../entities/data-entry/amc/ProductRegistryAttributes";
import { RawProductConsumption } from "../../../../entities/data-entry/amc/RawProductConsumption";
import {
    Content,
    ContentDDDPerProductAndDDDPerPackage,
    ContentTonnesPerProduct,
    DDDPerPackage,
    DDDPerProduct,
    DDDPerProductConsumptionPackages,
    RawSubstanceConsumptionCalculated,
} from "../../../../entities/data-entry/amc/RawSubstanceConsumptionCalculated";

export function calculateConsumptionProductLevelData(
    period: string,
    orgUnitId: Id,
    teiInstancesData: ProductRegistryAttributes[],
    rawProductConsumptionData: RawProductConsumption[],
    atcClassification: GlassAtcVersionData,
    atcVersion: string
): RawSubstanceConsumptionCalculated[] {
    logger.info(
        `[${new Date().toISOString()}] Starting the calculation of consumption product level data for organisation ${orgUnitId} and period ${period}`
    );

    if (!Object.keys(atcClassification)?.length) {
        logger.error(`[${new Date().toISOString()}] Atc classsification data is empty.`);
        return [];
    }

    const dddCombinations = atcClassification?.combinations;
    const dddData = atcClassification?.ddds;
    const dddChanges = getDDDChanges(atcClassification?.changes);
    const atcChanges = getATCChanges(atcClassification?.changes);
    const unitsData = atcClassification?.units;
    const conversionsIUToGramsData = atcClassification?.conversions_iu_g;
    const amClassData = atcClassification.am_classification;
    const awareClassData = atcClassification.aware_classification;
    const atcData = atcClassification.atcs;

    let calculationLogs: BatchLogContent = [];

    const contentDDDPerProductAndDDDPerPackage: ContentDDDPerProductAndDDDPerPackage[] = teiInstancesData
        .map((product: ProductRegistryAttributes) => {
            calculationLogs = [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Product ${
                        product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                    } - Calculating content, ddd and  ddd_per_pack of product.`,
                    messageType: "Info",
                },
            ];
            // 1 - Calculate the content per product = content
            const content = calculateContentPerProduct(product, unitsData);
            calculationLogs = [...calculationLogs, ...content.logs];

            if (content.result) {
                // 2 - Identify corresponding DDD per product = ddd
                const dddPerProduct = calculateDDDPerProduct(
                    product,
                    dddCombinations,
                    dddData,
                    dddChanges,
                    atcChanges,
                    unitsData
                );
                calculationLogs = [...calculationLogs, ...dddPerProduct.logs];

                // 3 - Calculate DDD per package = ddd_per_pack
                const dddPerPackage = calculateDDDPerPackage(
                    product,
                    content.result,
                    dddPerProduct.result,
                    conversionsIUToGramsData,
                    atcChanges
                );
                calculationLogs = [...calculationLogs, ...dddPerPackage.logs];

                return {
                    AMR_GLASS_AMC_TEA_PRODUCT_ID: product.AMR_GLASS_AMC_TEA_PRODUCT_ID,
                    content: content.result,
                    dddPerProduct: dddPerProduct.result,
                    dddPerPackage: dddPerPackage.result,
                };
            }
        })
        .filter(Boolean) as ContentDDDPerProductAndDDDPerPackage[];

    // Given 1&2&3 calculates 4, 5, 6, 7, 8
    const rawSubstanceConsumptionCalculated = aggregateDataByAtcRouteAdminYearHealthSectorAndHealthLevel(
        period,
        orgUnitId,
        teiInstancesData,
        rawProductConsumptionData,
        contentDDDPerProductAndDDDPerPackage,
        conversionsIUToGramsData,
        amClassData,
        awareClassData,
        atcData,
        atcChanges,
        atcVersion
    );

    calculationLogs = [...calculationLogs, ...rawSubstanceConsumptionCalculated.logs];
    logger.batchLog(calculationLogs);

    logger.success(
        `[${new Date().toISOString()}] End of the calculation of consumption product level data for organisation ${orgUnitId} and period ${period}`
    );

    return rawSubstanceConsumptionCalculated.result;
}

// 1 - Calculate the content per product
function calculateContentPerProduct(
    product: ProductRegistryAttributes,
    unitsData: UnitsData[]
): { result: Content | undefined; logs: BatchLogContent } {
    const calculationLogs: BatchLogContent = [
        {
            content: `[${new Date().toISOString()}]  Product ${
                product.AMR_GLASS_AMC_TEA_PRODUCT_ID
            } - Calculating content of product.`,
            messageType: "Info",
        },
    ];
    const {
        AMR_GLASS_AMC_TEA_STRENGTH,
        AMR_GLASS_AMC_TEA_STRENGTH_UNIT,
        AMR_GLASS_AMC_TEA_CONC_VOLUME: maybeConcVolume,
        AMR_GLASS_AMC_TEA_VOLUME: maybeVolume,
        AMR_GLASS_AMC_TEA_PACKSIZE,
    } = product;

    if (isStrengthUnitValid(AMR_GLASS_AMC_TEA_STRENGTH_UNIT, unitsData)) {
        const standarizedStrength = getStandardizedUnitsAndValue(
            unitsData,
            AMR_GLASS_AMC_TEA_STRENGTH_UNIT,
            AMR_GLASS_AMC_TEA_STRENGTH
        );

        if (standarizedStrength && standarizedStrength.standarizedUnit) {
            const standarizedConcVolumeValue = maybeConcVolume ?? 1;
            const standarizedVolumeValue = maybeVolume ?? 1;

            // 1d - content = standardized_strength × (standardized_volume ÷ standardized_conc_volume) × packsize
            const content =
                standarizedStrength.standarizedValue *
                (standarizedVolumeValue / standarizedConcVolumeValue) *
                AMR_GLASS_AMC_TEA_PACKSIZE;

            return {
                result: {
                    value: content,
                    standarizedStrengthUnit: standarizedStrength.standarizedUnit,
                },
                logs: [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}]  Product ${
                            product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                        } - Content of product: ${content} ${standarizedStrength.standarizedUnit}`,
                        messageType: "Debug",
                    },
                ],
            };
        }

        return {
            result: undefined,
            logs: calculationLogs,
        };
    }

    return {
        result: undefined,
        logs: [
            ...calculationLogs,
            {
                content: `[${new Date().toISOString()}]  Product ${
                    product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                } - Content of product cannot be calculated. Strength unit, concentration volume unit or volume unit not valid.`,
                messageType: "Error",
            },
        ],
    };
}

// 2 - Identify corresponding DDD per product
function calculateDDDPerProduct(
    product: ProductRegistryAttributes,
    dddCombinations: CombinationsData[] | undefined,
    dddData: DDDData[] | undefined,
    dddChanges: DDDChangesData[] | undefined,
    atcChanges: ATCChangesData[] | undefined,
    unitsData: UnitsData[]
): { result: DDDPerProduct | undefined; logs: BatchLogContent } {
    if (product.AMR_GLASS_AMC_TEA_COMBINATION) {
        const codeCombinationData = dddCombinations?.find(
            ({ COMB_CODE, ATC5 }) =>
                COMB_CODE === product.AMR_GLASS_AMC_TEA_COMBINATION ||
                ATC5 === getNewAtcCode(product.AMR_GLASS_AMC_TEA_ATC, atcChanges)
        );
        return getDDDOfProductFromDDDCombinationsTable(product, codeCombinationData, atcChanges, dddChanges, unitsData);
    } else {
        return getDDDOfProductFromDDDTable(product, dddData, atcChanges, dddChanges, unitsData);
    }
}

// 2b
function getDDDOfProductFromDDDCombinationsTable(
    product: ProductRegistryAttributes,
    codeCombinationData: CombinationsData | undefined,
    atcChanges: ATCChangesData[] | undefined,
    dddChanges: DDDChangesData[] | undefined,
    unitsData: UnitsData[]
): { result: DDDPerProduct | undefined; logs: BatchLogContent } {
    let calculationLogs: BatchLogContent = [];

    if (codeCombinationData) {
        calculationLogs = [
            ...calculationLogs,
            {
                content: `[${new Date().toISOString()}]  Product ${
                    product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                } - Identifying corresponding ddd_value and ddd_unit using code combination data: ${codeCombinationData}.`,
                messageType: "Info",
            },
        ];

        const { DDD: DDD_VALUE, DDD_UNIT } = codeCombinationData;

        return {
            result: {
                dddValue: DDD_VALUE,
                dddUnit: DDD_UNIT,
            },
            logs: calculationLogs,
        };
    }

    calculationLogs = [
        ...calculationLogs,
        {
            content: `[${new Date().toISOString()}] Product ${
                product.AMR_GLASS_AMC_TEA_PRODUCT_ID
            } - Combination code not found in combinations json for product ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`,
            messageType: "Warn",
        },
    ];

    return getLatestDDDStandardized(product, atcChanges, dddChanges, unitsData, calculationLogs);
}

// 2c
function getDDDOfProductFromDDDTable(
    product: ProductRegistryAttributes,
    dddData: DDDData[] | undefined,
    atcChanges: ATCChangesData[] | undefined,
    dddChanges: DDDChangesData[] | undefined,
    unitsData: UnitsData[]
): { result: DDDPerProduct | undefined; logs: BatchLogContent } {
    const { AMR_GLASS_AMC_TEA_ATC, AMR_GLASS_AMC_TEA_ROUTE_ADMIN, AMR_GLASS_AMC_TEA_SALT } = product;
    let calculationLogs: BatchLogContent = [
        {
            content: `[${new Date().toISOString()}] Product ${
                product.AMR_GLASS_AMC_TEA_PRODUCT_ID
            } - Identifying corresponding ddd_value and ddd_unit from ddd json using: ${AMR_GLASS_AMC_TEA_ATC}, ${AMR_GLASS_AMC_TEA_ROUTE_ADMIN} and ${AMR_GLASS_AMC_TEA_SALT}`,
            messageType: "Info",
        },
    ];

    const dddDataFound = dddData?.find(({ ATC5, SALT, ROA }) => {
        const isDefaultSalt = !SALT && AMR_GLASS_AMC_TEA_SALT === DEFAULT_SALT_CODE;

        return (
            (ATC5 === AMR_GLASS_AMC_TEA_ATC || ATC5 === getNewAtcCode(product.AMR_GLASS_AMC_TEA_ATC, atcChanges)) &&
            ROA === AMR_GLASS_AMC_TEA_ROUTE_ADMIN &&
            (SALT === AMR_GLASS_AMC_TEA_SALT || isDefaultSalt)
        );
    });

    if (dddDataFound) {
        const dddStandardizedUnit = getStandardizedUnit(unitsData, dddDataFound.DDD_UNIT);
        if (dddStandardizedUnit) {
            return {
                result: {
                    dddValue: dddDataFound.DDD_STD,
                    dddUnit: dddStandardizedUnit,
                },
                logs: [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Product ${
                            product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                        } - DDD data found in ddd json: ${dddDataFound.DDD_STD} ${dddStandardizedUnit}`,
                        messageType: "Debug",
                    },
                ],
            };
        }
        return {
            result: undefined,
            logs: [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Product ${
                        product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                    } - Standarized unit not found in units data for: ${dddDataFound.DDD_UNIT}`,
                    messageType: "Error",
                },
            ],
        };
    }

    calculationLogs = [
        ...calculationLogs,
        {
            content: `[${new Date().toISOString()}] Product ${
                product.AMR_GLASS_AMC_TEA_PRODUCT_ID
            } - DDD data not found in ddd json of product.`,
            messageType: "Warn",
        },
    ];

    return getLatestDDDStandardized(product, atcChanges, dddChanges, unitsData, calculationLogs);
}

// 2d
function getLatestDDDStandardized(
    product: ProductRegistryAttributes,
    atcChanges: ATCChangesData[] | undefined,
    dddChanges: DDDChangesData[] | undefined,
    unitsData: UnitsData[],
    calculationLogs: BatchLogContent
): { result: DDDPerProduct | undefined; logs: BatchLogContent } {
    const atcCode = getNewAtcCode(product.AMR_GLASS_AMC_TEA_ATC, atcChanges) || product.AMR_GLASS_AMC_TEA_ATC;
    calculationLogs = [
        ...calculationLogs,
        {
            content: `[${new Date().toISOString()}] Product ${
                product.AMR_GLASS_AMC_TEA_PRODUCT_ID
            } - Get latest ddd_value and ddd_unit from ddd changes using: ${atcCode}`,
            messageType: "Info",
        },
    ];

    const newDddData = getNewDddData(atcCode, product.AMR_GLASS_AMC_TEA_ROUTE_ADMIN, dddChanges);

    if (newDddData) {
        const dddStandardized = getStandardizedUnitsAndValue(
            unitsData,
            newDddData.NEW_DDD_UNIT,
            newDddData.NEW_DDD_VALUE
        );

        if (dddStandardized?.standarizedUnit) {
            return {
                result: {
                    dddValue: dddStandardized.standarizedValue,
                    dddUnit: dddStandardized.standarizedUnit,
                },
                logs: [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Product ${
                            product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                        } - DDD data found in changes json: ${dddStandardized.standarizedValue} ${
                            dddStandardized.standarizedUnit
                        }`,
                        messageType: "Warn",
                    },
                ],
            };
        }

        return {
            result: undefined,
            logs: [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Product ${
                        product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                    } - Standarized unit not found for ${newDddData.NEW_DDD_UNIT}.`,
                    messageType: "Error",
                },
            ],
        };
    }

    return {
        result: undefined,
        logs: [
            ...calculationLogs,
            {
                content: `[${new Date().toISOString()}] Product ${
                    product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                } - DDD data not found in changes json for product: ${JSON.stringify(product)}`,
                messageType: "Error",
            },
        ],
    };
}

// 3 - Calculate DDD per package
function calculateDDDPerPackage(
    product: ProductRegistryAttributes,
    content: Content,
    dddPerProduct: DDDPerProduct | undefined,
    conversionsIUToGramsData: ConversionsIUToGramsData[] | undefined,
    atcChanges: ATCChangesData[] | undefined
): { result: DDDPerPackage | undefined; logs: BatchLogContent } {
    const calculationLogs: BatchLogContent = [
        {
            content: `[${new Date().toISOString()}] Product ${
                product.AMR_GLASS_AMC_TEA_PRODUCT_ID
            } - Calculating ddd per package of product.`,
            messageType: "Info",
        },
    ];

    if (dddPerProduct) {
        const { AMR_GLASS_AMC_TEA_ATC, AMR_GLASS_AMC_TEA_ROUTE_ADMIN } = product;

        const { standarizedStrengthUnit } = content;

        const conversionFactorIuToGram = conversionsIUToGramsData?.find(
            ({ ATC5, ROA }) =>
                (ATC5 === AMR_GLASS_AMC_TEA_ATC || ATC5 === getNewAtcCode(AMR_GLASS_AMC_TEA_ATC, atcChanges)) &&
                ROA === AMR_GLASS_AMC_TEA_ROUTE_ADMIN
        );

        // 3a
        const conversionFactor =
            standarizedStrengthUnit !== dddPerProduct.dddUnit && conversionFactorIuToGram?.FACTOR
                ? conversionFactorIuToGram.FACTOR
                : 1;

        // 3b - ddd_per_pack = content × conv_factor ÷ ddd_value
        return {
            result: {
                value: (content.value * conversionFactor) / dddPerProduct.dddValue,
                dddUnit: dddPerProduct.dddUnit,
            },
            logs: [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Product ${
                        product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                    } - Conversion factor used to calculate ddd_per_pack: ${conversionFactor}. ddd_per_pack: ${
                        (content.value * conversionFactor) / dddPerProduct.dddValue
                    } ${dddPerProduct.dddUnit}`,
                    messageType: "Debug",
                },
            ],
        };
    }

    return {
        result: undefined,
        logs: [
            ...calculationLogs,
            {
                content: `[${new Date().toISOString()}] Product ${
                    product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                } - ddd_value and ddd_unit of product not found: ${JSON.stringify(product)}`,
                messageType: "Error",
            },
        ],
    };
}

// 4 - Calculate DDD per product consumption packages
function calculateDDDPerProductConsumptionPackages(
    period: string,
    productConsumption: RawProductConsumption,
    dddPerPackage: DDDPerPackage | undefined
): { result: DDDPerProductConsumptionPackages | undefined; logs: BatchLogContent } {
    const calculationLogs: BatchLogContent = [
        {
            content: `[${new Date().toISOString()}] Product ${
                productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID
            } - Calculating DDD per product consumption packages using product consumption of product.`,
            messageType: "Info",
        },
    ];

    if (dddPerPackage) {
        const { AMR_GLASS_AMC_TEA_PRODUCT_ID, packages_manual, health_sector_manual, health_level_manual } =
            productConsumption;

        // 4b - ddd_cons_product = ddd_per_pack × packages (in year, health_sector and health_level)
        const dddConsumptionPackages = packages_manual ? dddPerPackage.value * packages_manual : undefined;
        return {
            result: {
                AMR_GLASS_AMC_TEA_PRODUCT_ID,
                year: period,
                health_sector_manual,
                health_level_manual,
                dddConsumptionPackages,
                dddUnit: dddPerPackage.dddUnit,
            },
            logs: [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}]  Product ${
                        productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID
                    } - DDD per product consumption packages: ${dddConsumptionPackages} (# packages: ${packages_manual})`,
                    messageType: "Info",
                },
            ],
        };
    }
    return {
        result: undefined,
        logs: [
            ...calculationLogs,
            {
                content: `[${new Date().toISOString()}]  Product ${
                    productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID
                } - ddd_value and ddd_unit of product not found: productConsumption=${JSON.stringify(
                    productConsumption
                )}`,
                messageType: "Error",
            },
        ],
    };
}

// 5b - Calculate tonnes per product
function getTonnesPerProduct(
    period: string,
    product: ProductRegistryAttributes,
    productConsumption: RawProductConsumption,
    content: Content,
    conversionsIUToGramsData: ConversionsIUToGramsData[] | undefined,
    atcChanges: ATCChangesData[] | undefined
): { result: ContentTonnesPerProduct; logs: BatchLogContent } {
    const calculationLogs: BatchLogContent = [
        {
            content: `[${new Date().toISOString()}]  Product ${
                productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID
            } - Calculating content tonnes of product.`,
            messageType: "Info",
        },
    ];

    const { AMR_GLASS_AMC_TEA_PRODUCT_ID: teiIdProduct, AMR_GLASS_AMC_TEA_ATC } = product;
    const { packages_manual, health_sector_manual, health_level_manual } = productConsumption;

    const { standarizedStrengthUnit: contentUnit } = content;
    // 5a
    const conversionFactorAtc = conversionsIUToGramsData?.find(
        ({ ATC5 }) => ATC5 === AMR_GLASS_AMC_TEA_ATC || ATC5 === getNewAtcCode(AMR_GLASS_AMC_TEA_ATC, atcChanges)
    );
    const conversionFactor = contentUnit !== "gram" && conversionFactorAtc?.FACTOR ? conversionFactorAtc.FACTOR : 1;

    // 5b - content_tonnes = (content × conv_factor × packages in the year, health_sector and health_level) ÷ 1e6
    return {
        result: {
            AMR_GLASS_AMC_TEA_PRODUCT_ID: teiIdProduct,
            year: period,
            health_sector_manual,
            health_level_manual,
            contentTonnes: packages_manual ? (content.value * conversionFactor * packages_manual) / 1e6 : undefined,
        },
        logs: [
            ...calculationLogs,
            {
                content: `[${new Date().toISOString()}]  Product ${
                    productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID
                } - Conversion factor used to calculate content_tonnes: ${conversionFactor}. Content tonnes: ${
                    packages_manual
                        ? (content.value * conversionFactor * packages_manual) / 1e6
                        : "Not packages manual defined"
                }`,
                messageType: "Debug",
            },
        ],
    };
}

// Given 1&2&3 calculates 4, 5, 6, 7, 8
function aggregateDataByAtcRouteAdminYearHealthSectorAndHealthLevel(
    period: string,
    orgUnitId: Id,
    teiInstancesData: ProductRegistryAttributes[],
    rawProductConsumptionData: RawProductConsumption[],
    contentDDDPerProductAndDDDPerPackage: ContentDDDPerProductAndDDDPerPackage[],
    conversionsIUToGramsData: ConversionsIUToGramsData[],
    amClassData: AmClassificationData,
    awareClassData: AwareClassificationData,
    atcData: ATCData[],
    atcChanges: ATCChangesData[] | undefined,
    atcVersion: string
): { result: RawSubstanceConsumptionCalculated[]; logs: BatchLogContent } {
    let calculationLogs: BatchLogContent = [];

    const rawSubstanceConsumptionCalculatedByKey = rawProductConsumptionData.reduce(
        (acc: Record<string, RawSubstanceConsumptionCalculated>, productConsumption: RawProductConsumption) => {
            const product = teiInstancesData.find(
                (product: ProductRegistryAttributes) =>
                    productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID === product.AMR_GLASS_AMC_TEA_PRODUCT_ID
            );
            calculationLogs = [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Product ${
                        productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID
                    } - Calculating raw substance consumption of product ${JSON.stringify(
                        product
                    )} with product consumption ${JSON.stringify(productConsumption)}`,
                    messageType: "Debug",
                },
            ];

            const contentDDDPerProductAndDDDPerPackageOfProduct = contentDDDPerProductAndDDDPerPackage.find(
                productData =>
                    productData.AMR_GLASS_AMC_TEA_PRODUCT_ID === productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID
            );

            if (product && contentDDDPerProductAndDDDPerPackageOfProduct) {
                // 4 - Calculate DDD per product consumption packages = ddd_cons_product
                const dddPerProductConsumptionPackages = calculateDDDPerProductConsumptionPackages(
                    period,
                    productConsumption,
                    contentDDDPerProductAndDDDPerPackageOfProduct.dddPerPackage
                );

                calculationLogs = [...calculationLogs, ...dddPerProductConsumptionPackages.logs];

                if (dddPerProductConsumptionPackages.result) {
                    // 5b - content_tonnes = (content × conv_factor × packages in year, health_sector and health_level) ÷ 1e6
                    const contentTonnesOfProduct = getTonnesPerProduct(
                        period,
                        product,
                        productConsumption,
                        contentDDDPerProductAndDDDPerPackageOfProduct.content,
                        conversionsIUToGramsData,
                        atcChanges
                    );
                    calculationLogs = [...calculationLogs, ...contentTonnesOfProduct.logs];

                    const {
                        AMR_GLASS_AMC_TEA_PRODUCT_ID,
                        AMR_GLASS_AMC_TEA_SALT,
                        AMR_GLASS_AMC_TEA_ATC,
                        AMR_GLASS_AMC_TEA_ROUTE_ADMIN,
                    } = product;
                    const { packages_manual, data_status_manual, health_sector_manual, health_level_manual } =
                        productConsumption;

                    const am_class = getAmClass(amClassData, AMR_GLASS_AMC_TEA_ATC);
                    const atcCodeByLevel = getAtcCodeByLevel(atcData, AMR_GLASS_AMC_TEA_ATC);
                    const aware = getAwareClass(awareClassData, AMR_GLASS_AMC_TEA_ATC);

                    // 5c, 6a, 7a, 8a
                    const id = `${AMR_GLASS_AMC_TEA_PRODUCT_ID}-${AMR_GLASS_AMC_TEA_ATC}-${AMR_GLASS_AMC_TEA_ROUTE_ADMIN}-${period}-${health_sector_manual}-${health_level_manual}-${data_status_manual}`;
                    const accWithThisId = acc[id] as RawSubstanceConsumptionCalculated;

                    const isAlreadyInTheAggregation =
                        accWithThisId &&
                        (accWithThisId?.kilograms_autocalculated || accWithThisId?.kilograms_autocalculated === 0) &&
                        (accWithThisId?.packages_autocalculated || accWithThisId?.packages_autocalculated === 0) &&
                        (accWithThisId?.ddds_autocalculated || accWithThisId?.ddds_autocalculated === 0);

                    if (isAlreadyInTheAggregation) {
                        calculationLogs = [
                            ...calculationLogs,
                            {
                                content: `[${new Date().toISOString()}]  Product ${AMR_GLASS_AMC_TEA_PRODUCT_ID} - Aggregating content tonnes and packages of: ${JSON.stringify(
                                    {
                                        AMR_GLASS_AMC_TEA_PRODUCT_ID,
                                        AMR_GLASS_AMC_TEA_ATC,
                                        AMR_GLASS_AMC_TEA_ROUTE_ADMIN,
                                        health_sector_manual,
                                        health_level_manual,
                                        data_status_manual,
                                    }
                                )}`,
                                messageType: "Debug",
                            },
                        ];
                    }

                    const contentKilograms = contentTonnesOfProduct.result.contentTonnes
                        ? contentTonnesOfProduct.result.contentTonnes * 1000
                        : undefined;
                    return {
                        ...acc,
                        [id]: isAlreadyInTheAggregation
                            ? {
                                  ...accWithThisId,
                                  kilograms_autocalculated: contentKilograms
                                      ? (accWithThisId.kilograms_autocalculated || 0) + contentKilograms
                                      : accWithThisId.kilograms_autocalculated,
                                  packages_autocalculated: packages_manual
                                      ? (accWithThisId.packages_autocalculated || 0) + packages_manual
                                      : accWithThisId.packages_autocalculated,
                                  ddds_autocalculated: dddPerProductConsumptionPackages.result.dddConsumptionPackages
                                      ? (accWithThisId.ddds_autocalculated || 0) +
                                        dddPerProductConsumptionPackages.result.dddConsumptionPackages
                                      : accWithThisId.ddds_autocalculated,
                              }
                            : {
                                  AMR_GLASS_AMC_TEA_PRODUCT_ID,
                                  atc_autocalculated: AMR_GLASS_AMC_TEA_ATC,
                                  route_admin_autocalculated: AMR_GLASS_AMC_TEA_ROUTE_ADMIN,
                                  salt_autocalculated: AMR_GLASS_AMC_TEA_SALT,
                                  year: period,
                                  packages_autocalculated: packages_manual,
                                  kilograms_autocalculated: contentKilograms,
                                  ddds_autocalculated: dddPerProductConsumptionPackages.result.dddConsumptionPackages,
                                  data_status_autocalculated: data_status_manual,
                                  health_sector_autocalculated: health_sector_manual,
                                  atc_version_autocalculated: atcVersion,
                                  health_level_autocalculated: health_level_manual,
                                  orgUnitId,
                                  am_class: am_class,
                                  atc2: atcCodeByLevel?.level2,
                                  atc3: atcCodeByLevel?.level3,
                                  atc4: atcCodeByLevel?.level4,
                                  aware: aware,
                              },
                    };
                } else {
                    calculationLogs = [
                        ...calculationLogs,
                        {
                            content: `[${new Date().toISOString()}]  Product ${
                                product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                            } - Data not calculated and moving to the next. DDD per product consumption packages cannot be calculated of product ${JSON.stringify(
                                product
                            )}`,
                            messageType: "Error",
                        },
                    ];
                    return acc;
                }
            } else {
                calculationLogs = [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}] Product ${
                            productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID
                        } - Data not calculated and moving to the next. Product, ddd of product or ddd_per_pack of product not found (product ${JSON.stringify(
                            product
                        )})`,
                        messageType: "Error",
                    },
                ];
                return acc;
            }
        },
        {} as Record<string, RawSubstanceConsumptionCalculated>
    );
    return {
        result: Object.values(rawSubstanceConsumptionCalculatedByKey),
        logs: calculationLogs,
    };
}
