import { logger } from "../../../../../utils/logger";
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
        `Starting the calculation of consumption product level data for organisation ${orgUnitId} and period ${period}`
    );

    if (!Object.keys(atcClassification)?.length) {
        logger.error(`Atc classsification data is empty.`);
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

    const contentDDDPerProductAndDDDPerPackage: ContentDDDPerProductAndDDDPerPackage[] = teiInstancesData
        .map((product: ProductRegistryAttributes) => {
            logger.debug(`Calculating content, ddd and  ddd_per_pack of product: ${JSON.stringify(product)}`);
            // 1 - Calculate the content per product = content
            const content = calculateContentPerProduct(product, unitsData);
            if (content) {
                // 2 - Identify corresponding DDD per product = ddd
                const dddPerProduct = calculateDDDPerProduct(
                    product,
                    dddCombinations,
                    dddData,
                    dddChanges,
                    atcChanges,
                    unitsData
                );
                // 3 - Calculate DDD per package = ddd_per_pack
                const dddPerPackage = calculateDDDPerPackage(
                    product,
                    content,
                    dddPerProduct,
                    conversionsIUToGramsData,
                    atcChanges
                );

                return {
                    AMR_GLASS_AMC_TEA_PRODUCT_ID: product.AMR_GLASS_AMC_TEA_PRODUCT_ID,
                    content,
                    dddPerProduct,
                    dddPerPackage,
                };
            }
        })
        .filter(Boolean) as ContentDDDPerProductAndDDDPerPackage[];

    // Given 1&2&3 calculates 4, 5, 6, 7, 8
    const rawSubstanceConsumptionCalculated: RawSubstanceConsumptionCalculated[] =
        aggregateDataByAtcRouteAdminYearHealthSectorAndHealthLevel(
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

    logger.success(
        `End of the calculation of consumption product level data for organisation ${orgUnitId} and period ${period}`
    );
    logger.debug(
        `End of the calculation of consumption product level data for organisation ${orgUnitId} and period ${period}: results=${JSON.stringify(
            rawSubstanceConsumptionCalculated
        )}`
    );

    return rawSubstanceConsumptionCalculated;
}

// 1 - Calculate the content per product
function calculateContentPerProduct(product: ProductRegistryAttributes, unitsData: UnitsData[]): Content | undefined {
    logger.info(`Calculating content of product: ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`);
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

            logger.debug(`Content of product: ${content} ${standarizedStrength.standarizedUnit}`);
            return {
                value: content,
                standarizedStrengthUnit: standarizedStrength.standarizedUnit,
            };
        }
    } else {
        logger.error(
            `Content of product cannot be calculated. Strength unit, concentration volume unit or volume unit not valid of product: ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`
        );
    }
}

// 2 - Identify corresponding DDD per product
function calculateDDDPerProduct(
    product: ProductRegistryAttributes,
    dddCombinations: CombinationsData[] | undefined,
    dddData: DDDData[] | undefined,
    dddChanges: DDDChangesData[] | undefined,
    atcChanges: ATCChangesData[] | undefined,
    unitsData: UnitsData[]
): DDDPerProduct | undefined {
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
): DDDPerProduct | undefined {
    if (codeCombinationData) {
        logger.info(
            `Identifying corresponding ddd_value and ddd_unit using code combination data: ${codeCombinationData}`
        );
        const { DDD: DDD_VALUE, DDD_UNIT } = codeCombinationData;
        logger.debug(`DDD data found in combinations json: ${DDD_VALUE} ${DDD_UNIT}`);

        return {
            dddValue: DDD_VALUE,
            dddUnit: DDD_UNIT,
        };
    } else {
        logger.warn(`Combination code not found in combinations json: ${product.AMR_GLASS_AMC_TEA_COMBINATION}`);
    }

    return getLatestDDDStandardized(product, atcChanges, dddChanges, unitsData);
}

// 2c
function getDDDOfProductFromDDDTable(
    product: ProductRegistryAttributes,
    dddData: DDDData[] | undefined,
    atcChanges: ATCChangesData[] | undefined,
    dddChanges: DDDChangesData[] | undefined,
    unitsData: UnitsData[]
): DDDPerProduct | undefined {
    const { AMR_GLASS_AMC_TEA_ATC, AMR_GLASS_AMC_TEA_ROUTE_ADMIN, AMR_GLASS_AMC_TEA_SALT } = product;
    logger.info(
        `Identifying corresponding ddd_value and ddd_unit from ddd json for ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID} using: ${AMR_GLASS_AMC_TEA_ATC}, ${AMR_GLASS_AMC_TEA_ROUTE_ADMIN} and ${AMR_GLASS_AMC_TEA_SALT}`
    );

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
            logger.debug(`DDD data found in ddd json: ${dddDataFound.DDD_STD} ${dddStandardizedUnit}`);
            return {
                dddValue: dddDataFound.DDD_STD,
                dddUnit: dddStandardizedUnit,
            };
        }
        logger.error(`Standarized unit not found in units data for: ${dddDataFound.DDD_UNIT}`);
    } else {
        logger.warn(`DDD data not found in ddd json of product: ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`);
    }

    return getLatestDDDStandardized(product, atcChanges, dddChanges, unitsData);
}

// 2d
function getLatestDDDStandardized(
    product: ProductRegistryAttributes,
    atcChanges: ATCChangesData[] | undefined,
    dddChanges: DDDChangesData[] | undefined,
    unitsData: UnitsData[]
): DDDPerProduct | undefined {
    const atcCode = getNewAtcCode(product.AMR_GLASS_AMC_TEA_ATC, atcChanges) || product.AMR_GLASS_AMC_TEA_ATC;
    logger.info(
        `Get latest ddd_value and ddd_unit from ddd changes for ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID} using: ${atcCode}`
    );

    const newDddData = getNewDddData(atcCode, product.AMR_GLASS_AMC_TEA_ROUTE_ADMIN, dddChanges);

    if (newDddData) {
        const dddStandardized = getStandardizedUnitsAndValue(
            unitsData,
            newDddData.NEW_DDD_UNIT,
            newDddData.NEW_DDD_VALUE
        );
        if (dddStandardized?.standarizedUnit) {
            logger.warn(
                `DDD data found in changes json: ${dddStandardized.standarizedValue} ${dddStandardized.standarizedUnit}`
            );

            return {
                dddValue: dddStandardized.standarizedValue,
                dddUnit: dddStandardized.standarizedUnit,
            };
        }
        logger.error(`Standarized unit not found for ${newDddData.NEW_DDD_UNIT}.`);
        logger.debug(`Standarized unit not found for ${newDddData.NEW_DDD_UNIT}. Product: ${JSON.stringify(product)}`);
    } else {
        logger.error(`DDD data not found in changes json for product: ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`);
        logger.debug(`DDD data not found in changes json for product: ${JSON.stringify(product)}`);
    }
}

// 3 - Calculate DDD per package
function calculateDDDPerPackage(
    product: ProductRegistryAttributes,
    content: Content,
    dddPerProduct: DDDPerProduct | undefined,
    conversionsIUToGramsData: ConversionsIUToGramsData[] | undefined,
    atcChanges: ATCChangesData[] | undefined
): DDDPerPackage | undefined {
    logger.info(`Calculating ddd per package of product: ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`);

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
        logger.debug(`Conversion factor used to calculate ddd_per_pack: ${conversionFactor}`);

        // 3b - ddd_per_pack = content × conv_factor ÷ ddd_value
        logger.debug(
            `Conversion factor used to calculate ddd_per_pack: ${
                (content.value * conversionFactor) / dddPerProduct.dddValue
            } ${dddPerProduct.dddUnit}`
        );

        return {
            value: (content.value * conversionFactor) / dddPerProduct.dddValue,
            dddUnit: dddPerProduct.dddUnit,
        };
    } else {
        logger.error(`ddd_value and ddd_unit of product not found: ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`);
        logger.debug(`ddd_value and ddd_unit of product not found: ${JSON.stringify(product)}`);
    }
}

// 4 - Calculate DDD per product consumption packages
function calculateDDDPerProductConsumptionPackages(
    period: string,
    productConsumption: RawProductConsumption,
    dddPerPackage: DDDPerPackage | undefined
): DDDPerProductConsumptionPackages | undefined {
    logger.info(
        `Calculating DDD per product consumption packages using product consumption of product ${productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID}`
    );
    logger.debug(
        `Calculating DDD per product consumption packages using product consumption: ${JSON.stringify(
            productConsumption
        )}`
    );
    if (dddPerPackage) {
        const { AMR_GLASS_AMC_TEA_PRODUCT_ID, packages_manual, health_sector_manual, health_level_manual } =
            productConsumption;

        // 4b - ddd_cons_product = ddd_per_pack × packages (in year, health_sector and health_level)
        const dddConsumptionPackages = dddPerPackage.value * packages_manual;
        logger.debug(`DDD per product consumption packages: ${dddConsumptionPackages}`);
        return {
            AMR_GLASS_AMC_TEA_PRODUCT_ID,
            year: period,
            health_sector_manual,
            health_level_manual,
            dddConsumptionPackages,
            dddUnit: dddPerPackage.dddUnit,
        };
    } else {
        logger.error(`ddd_per_pack of product ${productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID} not found.`);
        logger.debug(
            `ddd_value and ddd_unit of product not found: productConsumption=${JSON.stringify(productConsumption)}`
        );
    }
}

// 5b - Calculate tonnes per product
function getTonnesPerProduct(
    period: string,
    product: ProductRegistryAttributes,
    productConsumption: RawProductConsumption,
    content: Content,
    conversionsIUToGramsData: ConversionsIUToGramsData[] | undefined,
    atcChanges: ATCChangesData[] | undefined
): ContentTonnesPerProduct {
    logger.info(`Calculating content tonnes of product ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`);
    logger.debug(
        `Calculating content tonnes of product: ${JSON.stringify(product)} and ${JSON.stringify(productConsumption)}`
    );

    const { AMR_GLASS_AMC_TEA_PRODUCT_ID: teiIdProduct, AMR_GLASS_AMC_TEA_ATC } = product;
    const { packages_manual, health_sector_manual, health_level_manual } = productConsumption;

    const { standarizedStrengthUnit: contentUnit } = content;
    // 5a
    const conversionFactorAtc = conversionsIUToGramsData?.find(
        ({ ATC5 }) => ATC5 === AMR_GLASS_AMC_TEA_ATC || ATC5 === getNewAtcCode(AMR_GLASS_AMC_TEA_ATC, atcChanges)
    );
    const conversionFactor = contentUnit !== "gram" && conversionFactorAtc?.FACTOR ? conversionFactorAtc.FACTOR : 1;
    logger.debug(`Conversion factor used to calculate content_tonnes: ${conversionFactor}`);

    // 5b - content_tonnes = (content × conv_factor × packages in the year, health_sector and health_level) ÷ 1e6
    logger.debug(`Content tonnes: ${(content.value * conversionFactor * packages_manual) / 1e6}`);
    return {
        AMR_GLASS_AMC_TEA_PRODUCT_ID: teiIdProduct,
        year: period,
        health_sector_manual,
        health_level_manual,
        contentTonnes: (content.value * conversionFactor * packages_manual) / 1e6,
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
): RawSubstanceConsumptionCalculated[] {
    const rawSubstanceConsumptionCalculatedByKey = rawProductConsumptionData.reduce(
        (acc: Record<string, RawSubstanceConsumptionCalculated>, productConsumption: RawProductConsumption) => {
            const product = teiInstancesData.find(
                (product: ProductRegistryAttributes) =>
                    productConsumption.AMR_GLASS_AMC_TEA_PRODUCT_ID === product.AMR_GLASS_AMC_TEA_PRODUCT_ID
            );
            logger.debug(
                `Calculating raw substance consumption of product ${JSON.stringify(
                    product
                )} with product consumption ${JSON.stringify(productConsumption)}`
            );

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

                if (dddPerProductConsumptionPackages) {
                    // 5b - content_tonnes = (content × conv_factor × packages in year, health_sector and health_level) ÷ 1e6
                    const contentTonnesOfProduct: ContentTonnesPerProduct = getTonnesPerProduct(
                        period,
                        product,
                        productConsumption,
                        contentDDDPerProductAndDDDPerPackageOfProduct.content,
                        conversionsIUToGramsData,
                        atcChanges
                    );

                    const {
                        AMR_GLASS_AMC_TEA_PRODUCT_ID,
                        AMR_GLASS_AMC_TEA_SALT,
                        AMR_GLASS_AMC_TEA_ATC,
                        AMR_GLASS_AMC_TEA_ROUTE_ADMIN,
                    } = product;
                    const { packages_manual, data_status_manual, health_sector_manual, health_level_manual } =
                        productConsumption;

                    // 5c, 6a, 7a, 8a
                    const id = `${AMR_GLASS_AMC_TEA_PRODUCT_ID}-${AMR_GLASS_AMC_TEA_ATC}-${AMR_GLASS_AMC_TEA_ROUTE_ADMIN}-${period}-${health_sector_manual}-${health_level_manual}-${data_status_manual}`;
                    const accWithThisId = acc[id] as RawSubstanceConsumptionCalculated;

                    const isAlreadyInTheAggregation =
                        accWithThisId &&
                        (accWithThisId?.tons_autocalculated || accWithThisId?.tons_autocalculated === 0) &&
                        (accWithThisId?.packages_autocalculated || accWithThisId?.packages_autocalculated === 0) &&
                        (accWithThisId?.ddds_autocalculated || accWithThisId?.ddds_autocalculated === 0);

                    if (isAlreadyInTheAggregation) {
                        logger.debug(
                            `Aggregating content tonnes and packages of: ${JSON.stringify({
                                AMR_GLASS_AMC_TEA_PRODUCT_ID,
                                AMR_GLASS_AMC_TEA_ATC,
                                AMR_GLASS_AMC_TEA_ROUTE_ADMIN,
                                health_sector_manual,
                                health_level_manual,
                                data_status_manual,
                            })}`
                        );
                    }

                    const am_class = getAmClass(amClassData, AMR_GLASS_AMC_TEA_ATC);
                    const atcCodeByLevel = getAtcCodeByLevel(atcData, AMR_GLASS_AMC_TEA_ATC);
                    const aware = getAwareClass(awareClassData, AMR_GLASS_AMC_TEA_ATC);

                    if (
                        !atcCodeByLevel?.level2 ||
                        !atcCodeByLevel?.level3 ||
                        !atcCodeByLevel?.level4 ||
                        !am_class ||
                        !aware
                    ) {
                        logger.error(
                            `Data not found. atc2: ${atcCodeByLevel?.level2}, atc3: ${atcCodeByLevel?.level3}, atc4: ${atcCodeByLevel?.level4}, am_class: ${am_class}, aware: ${aware}`
                        );
                        return acc;
                    }

                    return {
                        ...acc,
                        [id]: isAlreadyInTheAggregation
                            ? {
                                  ...accWithThisId,
                                  tons_autocalculated:
                                      accWithThisId.tons_autocalculated + contentTonnesOfProduct.contentTonnes,
                                  packages_autocalculated: accWithThisId.packages_autocalculated + packages_manual,
                                  ddds_autocalculated:
                                      accWithThisId.ddds_autocalculated +
                                      dddPerProductConsumptionPackages.dddConsumptionPackages,
                              }
                            : {
                                  AMR_GLASS_AMC_TEA_PRODUCT_ID,
                                  atc_autocalculated: AMR_GLASS_AMC_TEA_ATC,
                                  route_admin_autocalculated: AMR_GLASS_AMC_TEA_ROUTE_ADMIN,
                                  salt_autocalculated: AMR_GLASS_AMC_TEA_SALT,
                                  year: period,
                                  packages_autocalculated: packages_manual,
                                  tons_autocalculated: contentTonnesOfProduct.contentTonnes,
                                  ddds_autocalculated: dddPerProductConsumptionPackages.dddConsumptionPackages,
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
                    logger.error(
                        `Data not calculated and moving to the next. DDD per product consumption packages cannot be calculated of product ${JSON.stringify(
                            product
                        )}`
                    );
                    logger.error(
                        `Data not calculated and moving to the next. DDD per product consumption packages cannot be calculated of product ${JSON.stringify(
                            product
                        )}`
                    );
                    return acc;
                }
            } else {
                logger.error(
                    `Data not calculated and moving to the next. Product, ddd of product or ddd_per_pack of product not found (product ${product?.AMR_GLASS_AMC_TEA_PRODUCT_ID})`
                );
                logger.debug(
                    `Data not calculated and moving to the next. Product, ddd of product or ddd_per_pack of product not found (product ${JSON.stringify(
                        product
                    )})`
                );
                return acc;
            }
        },
        {} as Record<string, RawSubstanceConsumptionCalculated>
    );
    return Object.values(rawSubstanceConsumptionCalculatedByKey);
}
