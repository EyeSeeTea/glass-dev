import { BatchLogContent, logger } from "../../../../../utils/logger";
import {
    ATCChangesData,
    ATCCodeLevel5,
    ATCData,
    ATCVersionKey,
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
    getNewAtcCodeRecursively,
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
    DDDPerPackage,
    DDDPerProduct,
    DDDPerProductConsumptionPackages,
    RawSubstanceConsumptionCalculated,
} from "../../../../entities/data-entry/amc/RawSubstanceConsumptionCalculated";

export function calculateConsumptionProductLevelData(
    period: string,
    orgUnitId: Id,
    productRegistryAttributes: ProductRegistryAttributes[],
    rawProductConsumptionRecords: RawProductConsumption[],
    atcClassification: GlassAtcVersionData,
    currentAtcVersion: ATCVersionKey,
    // default false: product-level uploads do NOT consult DDD changes
    allowDddChanges = false
): RawSubstanceConsumptionCalculated[] {
    logger.info(
        `[${new Date().toISOString()}] Starting the calculation of consumption product level data for organisation ${orgUnitId} and period ${period}`
    );

    if (!Object.keys(atcClassification)?.length) {
        logger.error(
            `[${new Date().toISOString()}] Atc classsification data is empty or atc version year not found: ${currentAtcVersion}`
        );
        return [];
    }

    const dddCombinations = atcClassification?.combinations;
    const dddData = atcClassification?.ddds;
    const dddChanges: DDDChangesData[] = getDDDChanges(atcClassification?.changes);
    const atcChanges: ATCChangesData[] = getATCChanges(atcClassification?.changes);
    const unitsData = atcClassification?.units;
    const conversionsIUToGramsData = atcClassification?.conversions_iu_g;
    const amClassData = atcClassification.am_classification;
    const awareClassData = atcClassification.aware_classification;
    const atcData = atcClassification.atcs;

    // Precompute lookup maps to avoid repeated .find(...) in hot loops.
    // Preserve first-match semantics by storing the first occurrence only,
    // and preserve original array order for grouped lists.
    const combinationMap: Record<string, CombinationsData> = {};
    (dddCombinations ?? []).forEach((cd) => {
        if (cd?.COMB_CODE && combinationMap[cd.COMB_CODE] === undefined) {
            combinationMap[cd.COMB_CODE] = cd;
        }
    });

    const conversionsMap: Record<string, ConversionsIUToGramsData> = {};
    (conversionsIUToGramsData ?? []).forEach((c) => {
        const key = `${c.ATC5}|${c.ROA}`;
        if (conversionsMap[key] === undefined) {
            conversionsMap[key] = c;
        }
    });

    const dddByAtcRoa: Map<string, DDDData[]> = new Map();
    (dddData ?? []).forEach((d) => {
        const key = `${d.ATC5}|${d.ROA}`;
        const arr = dddByAtcRoa.get(key);
        if (arr) arr.push(d);
        else dddByAtcRoa.set(key, [d]);
    });

    let calculationLogs: BatchLogContent = [];

    const contentDDDPerProductAndDDDPerPackage: ContentDDDPerProductAndDDDPerPackage[] = productRegistryAttributes
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
            
            // 1 - Calculate the active substance in a product package
            // the amount of active substance in one package of the product
            // calculated using: standardized_strength × (volume ÷ concentration_volume) × packsize
            // Note: volume and concentration_volume are expected to be pre-normalized upstream
            const amountActiveSubstancePerProductPackage = calculateActiveSubstancePerPackage(product, unitsData);
            calculationLogs = [...calculationLogs, ...amountActiveSubstancePerProductPackage.logs];

            const atcCodeAutocalculated: ATCCodeLevel5 =
                getNewAtcCodeRecursively({
                    oldAtcCode: product.AMR_GLASS_AMC_TEA_ATC,
                    atcChanges: atcChanges,
                    currentAtcs: atcData,
                }) || product.AMR_GLASS_AMC_TEA_ATC;

            if (amountActiveSubstancePerProductPackage.result) {
                // 2 - Identify corresponding DDD value for this product from the referential data = ddd
                // based on ATC5, SALT, ROA you get the related standard DDD from the
                // referential data for raw product and combination products. 
                // If the product has a combination code, the ddd is identified using the combination code, if not, it is identified using ATC5, SALT and ROA.
                const dddPerProduct = getDDDValueForProduct(
                    product,
                    dddCombinations,
                    dddData,
                    dddChanges,
                    unitsData,
                    atcCodeAutocalculated,
                    allowDddChanges,
                    combinationMap,
                    dddByAtcRoa
                );
                calculationLogs = [...calculationLogs, ...dddPerProduct.logs];

                // 3 - Calculate DDD per package = ddd_per_pack
                //DDD per package = content value × conversion factor ÷ product DDD value
                const dddPerPackage = calculateDDDPerPackage(
                    product,
                    amountActiveSubstancePerProductPackage.result,
                    dddPerProduct.result,
                    conversionsIUToGramsData,
                    atcCodeAutocalculated,
                    conversionsMap
                );
                calculationLogs = [...calculationLogs, ...dddPerPackage.logs];

                return {
                    AMR_GLASS_AMC_TEA_PRODUCT_ID: product.AMR_GLASS_AMC_TEA_PRODUCT_ID,
                    atcCodeAutocalculated: atcCodeAutocalculated,
                    content: amountActiveSubstancePerProductPackage.result,
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
        productRegistryAttributes,
        rawProductConsumptionRecords,
        contentDDDPerProductAndDDDPerPackage,
        amClassData,
        awareClassData,
        atcData,
        currentAtcVersion
    );

    calculationLogs = [...calculationLogs, ...rawSubstanceConsumptionCalculated.logs];
    logger.batchLog(calculationLogs);

    logger.success(
        `[${new Date().toISOString()}] End of the calculation of consumption product level data for organisation ${orgUnitId} and period ${period}`
    );

    return rawSubstanceConsumptionCalculated.result;
}

// 1 - Calculate the content per product - amount of active substance in one package of the product
function calculateActiveSubstancePerPackage(
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
            const amountActiveSubstancePerProductPackage =
                standarizedStrength.standarizedValue *
                (standarizedVolumeValue / standarizedConcVolumeValue) *
                AMR_GLASS_AMC_TEA_PACKSIZE;

            return {
                result: {
                    value: amountActiveSubstancePerProductPackage,
                    standarizedStrengthUnit: standarizedStrength.standarizedUnit,
                },
                logs: [
                    ...calculationLogs,
                    {
                        content: `[${new Date().toISOString()}]  Product ${
                            product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                        } - Content of product: ${amountActiveSubstancePerProductPackage} ${standarizedStrength.standarizedUnit}`,
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
                content: `[${new Date().toISOString()}] Product ${
                    product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                } - Content of product cannot be calculated. Strength unit not valid.`,
                messageType: "Error",
            },
        ],
    };
}

// 2 - Identify corresponding DDD value, unit and grams conversion for a product
function getDDDValueForProduct(
    product: ProductRegistryAttributes,
    dddCombinations: CombinationsData[] | undefined,
    dddData: DDDData[] | undefined,
    dddChanges: DDDChangesData[] | undefined,
    unitsData: UnitsData[],
    atcCodeAutocalculated: ATCCodeLevel5,
    // If false (default), do not consult DDD changes (product-level uploads)
    allowDddChanges = false,
    // Optional precomputed maps (preserve original behavior if undefined)
    combinationMap?: Record<string, CombinationsData>,
    dddByAtcRoa?: Map<string, DDDData[]>
): { result: DDDPerProduct | undefined; logs: BatchLogContent } {
    if (product.AMR_GLASS_AMC_TEA_COMBINATION) {
        const codeCombinationData =
            (combinationMap && combinationMap[product.AMR_GLASS_AMC_TEA_COMBINATION]) ??
            dddCombinations?.find(({ COMB_CODE }) => COMB_CODE === product.AMR_GLASS_AMC_TEA_COMBINATION);

        if (!codeCombinationData) {
            // If not found, log error as it should not happen
            return {
                result: undefined,
                logs: [
                    {
                        content: `[${new Date().toISOString()}] Product ${
                            product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                        } - Combination code not found in combinations json for product with combination code ${
                            product.AMR_GLASS_AMC_TEA_COMBINATION
                        }`,
                        messageType: "Error",
                    },
                ],
            };
        } else {
            return getDDDValueForCombinationProduct(product.AMR_GLASS_AMC_TEA_PRODUCT_ID, codeCombinationData, unitsData);
        }
    } else {
        return getDDDValueForPlainProduct(
            product,
            dddData,
            dddChanges,
            unitsData,
            atcCodeAutocalculated,
            allowDddChanges,
            dddByAtcRoa
        );
    }
}

// 2b
function getDDDValueForCombinationProduct(
    productId: string, 
    codeCombinationData: CombinationsData,
    unitsData: UnitsData[]
): { result: DDDPerProduct; logs: BatchLogContent } {
    const calculationLogs: BatchLogContent = [
        {
            content: `[${new Date().toISOString()}] Product ${productId} - Identifying corresponding ddd_value and ddd_unit using code combination data.`,
            messageType: "Info",
        },
    ];

    const { DDD: DDD_VALUE, DDD_UNIT, DDD_GRAMS } = codeCombinationData;

    const dddStandardized = getStandardizedUnitsAndValue(
        unitsData,
        DDD_UNIT,
        DDD_VALUE
    );

    if (!dddStandardized?.standarizedUnit) {
        return {
            result: {
                dddValue: DDD_VALUE,
                dddUnit: DDD_UNIT,
                dddGrams: DDD_GRAMS,
            },
            logs: [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}] Product ${productId} - Warning: Could not standardize DDD unit ${DDD_UNIT}. Using raw value.`,
                    messageType: "Debug",
                },
            ],
        };
    }

    return {
        result: {
            dddValue: dddStandardized.standarizedValue,
            dddUnit: dddStandardized.standarizedUnit,
            dddGrams: DDD_GRAMS,
        },
        logs: [
            ...calculationLogs,
            {
                content: `[${new Date().toISOString()}] Product ${productId} - DDD: ${dddStandardized.standarizedValue} ${dddStandardized.standarizedUnit}.`,
                messageType: "Debug",
            },
        ],
    };
}

// 2c
function getDDDValueForPlainProduct(
    product: ProductRegistryAttributes,
    dddData: DDDData[] | undefined,
    dddChanges: DDDChangesData[] | undefined,
    unitsData: UnitsData[],
    atcCodeAutocalculated: ATCCodeLevel5,
    // default false: product-level uploads do NOT consult DDD changes
    allowDddChanges = false,
    dddByAtcRoa?: Map<string, DDDData[]>
): { result: DDDPerProduct | undefined; logs: BatchLogContent } {
    const { AMR_GLASS_AMC_TEA_ROUTE_ADMIN, AMR_GLASS_AMC_TEA_SALT } = product;
    let calculationLogs: BatchLogContent = [
        {
            content: `[${new Date().toISOString()}] Product ${
                product.AMR_GLASS_AMC_TEA_PRODUCT_ID
            } - Identifying corresponding ddd_value and ddd_unit and ddd_grams from ddd referential using: ${atcCodeAutocalculated}, ${AMR_GLASS_AMC_TEA_ROUTE_ADMIN} and ${AMR_GLASS_AMC_TEA_SALT}`,
            messageType: "Info",
        },
    ];

    let dddDataFound;
    if (dddByAtcRoa) {
        const groupKey = `${atcCodeAutocalculated}|${AMR_GLASS_AMC_TEA_ROUTE_ADMIN}`;
        const group = dddByAtcRoa.get(groupKey);
        dddDataFound = group?.find(({ ATC5, SALT, ROA }) => {
            const isDefaultSalt = !SALT && AMR_GLASS_AMC_TEA_SALT === DEFAULT_SALT_CODE;

            return (
                ATC5 === atcCodeAutocalculated &&
                ROA === AMR_GLASS_AMC_TEA_ROUTE_ADMIN &&
                (SALT === AMR_GLASS_AMC_TEA_SALT || isDefaultSalt)
            );
        });
    }

    if (!dddDataFound) {
        dddDataFound = dddData?.find(({ ATC5, SALT, ROA }) => {
            const isDefaultSalt = !SALT && AMR_GLASS_AMC_TEA_SALT === DEFAULT_SALT_CODE;

            return (
                ATC5 === atcCodeAutocalculated &&
                ROA === AMR_GLASS_AMC_TEA_ROUTE_ADMIN &&
                (SALT === AMR_GLASS_AMC_TEA_SALT || isDefaultSalt)
            );
        });
    }

    if (dddDataFound) {
        const dddStandardizedUnit = getStandardizedUnit(unitsData, dddDataFound.DDD_UNIT);
        if (dddStandardizedUnit) {
            return {
                result: {
                    dddValue: dddDataFound.DDD_STD,
                    dddUnit: dddStandardizedUnit,
                    dddGrams: dddDataFound.DDD_GRAMS,
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

    // If not found in ddd table, decide whether to consult ddd changes
    if (!allowDddChanges) {
        calculationLogs = [
            ...calculationLogs,
            {
                content: `[${new Date().toISOString()}] Product ${
                    product.AMR_GLASS_AMC_TEA_PRODUCT_ID
                } - Skipping DDD changes lookup (product-level upload policy).`,
                messageType: "Warn",
            },
        ];

        return {
            result: undefined,
            logs: calculationLogs,
        };
    }

    // If allowed (recalc/substance workflows), consult changes
    return getLatestDDDStandardized(product, dddChanges, unitsData, calculationLogs, atcCodeAutocalculated, dddByAtcRoa);
}

// 2d
function getLatestDDDStandardized(
    product: ProductRegistryAttributes,
    dddChanges: DDDChangesData[] | undefined,
    unitsData: UnitsData[],
    calculationLogs: BatchLogContent,
    atcCodeAutocalculated: ATCCodeLevel5,
    dddByAtcRoa?: Map<string, DDDData[]>
): { result: DDDPerProduct | undefined; logs: BatchLogContent } {
    calculationLogs = [
        ...calculationLogs,
        {
            content: `[${new Date().toISOString()}] Product ${
                product.AMR_GLASS_AMC_TEA_PRODUCT_ID
            } - Get latest ddd_value and ddd_unit from ddd changes using: ${atcCodeAutocalculated}`,
            messageType: "Info",
        },
    ];

    const newDddData = getNewDddData({
        atcCode: atcCodeAutocalculated,
        roa: product.AMR_GLASS_AMC_TEA_ROUTE_ADMIN,
        dddChanges: dddChanges,
    });

    if (newDddData) {
        const dddStandardized = getStandardizedUnitsAndValue(
            unitsData,
            newDddData.NEW_DDD_UNIT,
            newDddData.NEW_DDD_VALUE
        );

        if (dddStandardized?.standarizedUnit) {
            const dddGrams =
                dddByAtcRoa?.get(`${newDddData.ATC_CODE}|${newDddData.NEW_DDD_ROA}`)?.[0]?.DDD_GRAMS ?? null;
            return {
                result: {
                    dddValue: dddStandardized.standarizedValue,
                    dddUnit: dddStandardized.standarizedUnit,
                    dddGrams,
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
    atcCodeAutocalculated: ATCCodeLevel5,
    conversionsMap?: Record<string, ConversionsIUToGramsData>
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
        const { AMR_GLASS_AMC_TEA_ROUTE_ADMIN } = product;

        const { standarizedStrengthUnit } = content;

        const key = `${atcCodeAutocalculated}|${AMR_GLASS_AMC_TEA_ROUTE_ADMIN}`;
        const conversionFactorIuToGram =
            conversionsMap?.[key] ??
            conversionsIUToGramsData?.find(
                ({ ATC5, ROA }) => ATC5 === atcCodeAutocalculated && ROA === AMR_GLASS_AMC_TEA_ROUTE_ADMIN
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

// 4 - Calculate DDD per product consumption packages - ddd_per_pack × packages (in year, health_sector and health_level)
function calculateDDDForAllPackagesConsumed(
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

        // 4b - ddd_cons_product = ddd_perpackage × packages (in year, health_sector and health_level)
        // dddPerPackage variable contains value, unit and grams of DDD for each package of this product
        // productConsumption gives packages_manual which is the number of packages consumed in the year for the health sector and health level of the product
        const dddOfProductConsumed =
            packages_manual !== null && packages_manual !== undefined
                ? dddPerPackage.value * packages_manual
                : undefined;

        return {
            result: {
                AMR_GLASS_AMC_TEA_PRODUCT_ID,
                year: period,
                health_sector_manual,
                health_level_manual,
                dddOfProductConsumed,
                dddUnit: dddPerPackage.dddUnit,
            },
            logs: [
                ...calculationLogs,
                {
                    content: `[${new Date().toISOString()}]  Product ${
                        productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID
                    } - DDD per product consumption packages: ${dddOfProductConsumed} (# packages: ${packages_manual})`,
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
/*function getTonnesPerProduct(
    period: string,
    product: ProductRegistryAttributes,
    productConsumption: RawProductConsumption,
    content: Content,
    conversionsIUToGramsData: ConversionsIUToGramsData[] | undefined,
    atcCodeAutocalculated: ATCCodeLevel5
): { result: ContentTonnesPerProduct; logs: BatchLogContent } {
    const calculationLogs: BatchLogContent = [
        {
            content: `[${new Date().toISOString()}]  Product ${productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID
                } - Calculating content tonnes of product.`,
            messageType: "Info",
        },
    ];

    const { AMR_GLASS_AMC_TEA_PRODUCT_ID: teiIdProduct } = product;
    const { packages_manual, health_sector_manual, health_level_manual } = productConsumption;

    const { standarizedStrengthUnit: contentUnit } = content;
    // 5a
    const conversionFactorAtc = conversionsIUToGramsData?.find(({ ATC5 }) => ATC5 === atcCodeAutocalculated);
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
                content: `[${new Date().toISOString()}]  Product ${productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID
                    } - Conversion factor used to calculate content_tonnes: ${conversionFactor}. Content tonnes: ${packages_manual
                        ? (content.value * conversionFactor * packages_manual) / 1e6
                        : "Not packages manual defined"
                    }`,
                messageType: "Debug",
            },
        ],
    };
}*/

// Given 1&2&3 calculates 4, 5, 6, 7, 8
function aggregateDataByAtcRouteAdminYearHealthSectorAndHealthLevel(
    period: string,
    orgUnitId: Id,
    productRegistryAttributes: ProductRegistryAttributes[],
    rawProductConsumptionData: RawProductConsumption[],
    contentDDDPerProductAndDDDPerPackage: ContentDDDPerProductAndDDDPerPackage[],
    amClassData: AmClassificationData,
    awareClassData: AwareClassificationData,
    atcData: ATCData[],
    currentAtcVersion: string
): { result: RawSubstanceConsumptionCalculated[]; logs: BatchLogContent } {
    let calculationLogs: BatchLogContent = [];

    // Precompute maps for fast lookup while preserving first-match semantics
    const productAttributesByProductId: Record<string, ProductRegistryAttributes> = {};
    (productRegistryAttributes ?? []).forEach((p) => {
        const k = p?.AMR_GLASS_AMC_TEA_PRODUCT_ID;
        if (k !== undefined && productAttributesByProductId[k] === undefined) productAttributesByProductId[k] = p;
    });

    const calculatedVariablesByProductId: Record<string, ContentDDDPerProductAndDDDPerPackage> = {};
    (contentDDDPerProductAndDDDPerPackage ?? []).forEach((c) => {
        const k = c?.AMR_GLASS_AMC_TEA_PRODUCT_ID;
        if (k !== undefined && calculatedVariablesByProductId[k] === undefined) calculatedVariablesByProductId[k] = c;
    });

    const rawSubstanceConsumptionCalculatedByKey = rawProductConsumptionData.reduce(
        (aggregatedConsumptions: Record<string, RawSubstanceConsumptionCalculated>, productConsumption: RawProductConsumption) => {
            const product = productAttributesByProductId[productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID];
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
            const contentDDDPerProductAndDDDPerPackageOfProduct = calculatedVariablesByProductId[productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID];

            if (product && contentDDDPerProductAndDDDPerPackageOfProduct) {
                // 4 - Calculate DDD per product consumption packages:  ddd_cons_product = ddd_perpackage × packages (in year, health_sector and health_level)
                const dddPerProductConsumptionPackages = calculateDDDForAllPackagesConsumed(
                    period,
                    productConsumption,
                    contentDDDPerProductAndDDDPerPackageOfProduct.dddPerPackage
                );

                calculationLogs = [...calculationLogs, ...dddPerProductConsumptionPackages.logs];

                if (dddPerProductConsumptionPackages.result) {
                    const atcCodeAutocalculated = contentDDDPerProductAndDDDPerPackageOfProduct.atcCodeAutocalculated;

                    //calculate the atc as kilograms using the DDD_GRAMS variable from the DDD sheet
                    const dddGrams = contentDDDPerProductAndDDDPerPackageOfProduct.dddPerProduct?.dddGrams ?? 0;
                    const contentKilograms =
                        dddPerProductConsumptionPackages.result.dddOfProductConsumed != null
                            ? (dddPerProductConsumptionPackages.result.dddOfProductConsumed * dddGrams) / 1000
                            : undefined;

                    calculationLogs = [...calculationLogs];
                    const { AMR_GLASS_AMC_TEA_COMBINATION , AMR_GLASS_AMC_TEA_PRODUCT_ID, AMR_GLASS_AMC_TEA_SALT, AMR_GLASS_AMC_TEA_ROUTE_ADMIN } =
                        product;
                    const { packages_manual, data_status_manual, health_sector_manual, health_level_manual } =
                        productConsumption;

                    const am_class = getAmClass(amClassData, atcCodeAutocalculated);
                    const atcCodeByLevel = getAtcCodeByLevel(atcData, atcCodeAutocalculated);
                    const aware = getAwareClass(awareClassData, atcCodeAutocalculated, AMR_GLASS_AMC_TEA_ROUTE_ADMIN);

                    // 5c, 6a, 7a, 8a
                    // Aggregated within the same product: includes PRODUCT_ID, COMBINATION, SALT, ATC, ROA, and context dimensions.
                    // Different products that share the same ATC5/ROA/SALT remain as separate rows here (product-level output).
                    // Cross-product substance aggregation happens downstream in mapRawSubstanceCalculatedToSubstanceCalculated.
                    const id = `${AMR_GLASS_AMC_TEA_PRODUCT_ID}-${AMR_GLASS_AMC_TEA_COMBINATION}-${AMR_GLASS_AMC_TEA_SALT}-${atcCodeAutocalculated}-${AMR_GLASS_AMC_TEA_ROUTE_ADMIN}-${period}-${health_sector_manual}-${health_level_manual}-${data_status_manual}`;
                    const aggregatedRecordWithThisId = aggregatedConsumptions[id] as RawSubstanceConsumptionCalculated;

                    // Consider the row present if an entry exists for the aggregation key.
                    const isAlreadyInTheAggregation = aggregatedRecordWithThisId !== undefined;

                    if (isAlreadyInTheAggregation) {
                        calculationLogs = [
                            ...calculationLogs,
                            {
                                content: `[${new Date().toISOString()}]  Product ${AMR_GLASS_AMC_TEA_PRODUCT_ID} - Aggregating content tonnes and packages of: ${JSON.stringify(
                                    {
                                        AMR_GLASS_AMC_TEA_PRODUCT_ID,
                                        atcCodeAutocalculated,
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

                    //[]
                    return {
                        ...aggregatedConsumptions,
                        [id]: isAlreadyInTheAggregation
                            ? {
                                  ...aggregatedRecordWithThisId,
                                  kilograms_autocalculated:
                                      contentKilograms != null
                                          ? (aggregatedRecordWithThisId.kilograms_autocalculated ?? 0) + contentKilograms
                                          : aggregatedRecordWithThisId.kilograms_autocalculated,
                                  packages_autocalculated:
                                      packages_manual != null
                                          ? (aggregatedRecordWithThisId.packages_autocalculated ?? 0) + packages_manual
                                          : aggregatedRecordWithThisId.packages_autocalculated,
                                  ddds_autocalculated:
                                      dddPerProductConsumptionPackages.result.dddOfProductConsumed != null
                                          ? (aggregatedRecordWithThisId.ddds_autocalculated ?? 0) +
                                            dddPerProductConsumptionPackages.result.dddOfProductConsumed
                                          : aggregatedRecordWithThisId.ddds_autocalculated,
                              }
                            : {
                                  AMR_GLASS_AMC_TEA_PRODUCT_ID,
                                  atc_autocalculated: atcCodeAutocalculated,
                                  combination_code_autocalculated: AMR_GLASS_AMC_TEA_COMBINATION,
                                  route_admin_autocalculated: AMR_GLASS_AMC_TEA_ROUTE_ADMIN,
                                  salt_autocalculated: AMR_GLASS_AMC_TEA_SALT,
                                  year: period,
                                  packages_autocalculated: packages_manual,
                                  kilograms_autocalculated: contentKilograms,
                                  ddds_autocalculated: dddPerProductConsumptionPackages.result.dddOfProductConsumed,
                                  data_status_autocalculated: data_status_manual,
                                  health_sector_autocalculated: health_sector_manual,
                                  atc_version_autocalculated: currentAtcVersion,
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
                    return aggregatedConsumptions;
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
                return aggregatedConsumptions;
            }
        },
        {} as Record<string, RawSubstanceConsumptionCalculated>
    );
    return {
        result: Object.values(rawSubstanceConsumptionCalculatedByKey),
        logs: calculationLogs,
    };
}
