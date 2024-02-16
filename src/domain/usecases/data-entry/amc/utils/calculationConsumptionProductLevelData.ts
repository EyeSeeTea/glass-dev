import { logger } from "../../../../../utils/logger";
import {
    ConversionFactorData,
    DDDAlterationsData,
    DDDCombinationsData,
    DDDData,
    GlassATCVersion,
} from "../../../../entities/GlassATC";
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
import { ROUTE_OF_ADMINISTRATION_MAPPING } from "../../../../entities/data-entry/amc/RouteOfAdministration";
import { SALT_MAPPING } from "../../../../entities/data-entry/amc/Salt";
import {
    UNITS_MAPPING,
    UNITS_TO_STANDARDIZED_MEASUREMENT_UNIT,
    Unit,
    isConcVolumeUnitOrVolumeUnitValid,
    isStrengthUnitValid,
    valueToStandardizedMeasurementUnit,
} from "../../../../entities/data-entry/amc/Unit";

export function calculateConsumptionProductLevelData(
    period: string,
    orgUnitId: Id,
    teiInstancesData: ProductRegistryAttributes[],
    rawProductConsumptionData: RawProductConsumption[],
    atcClassification: GlassATCVersion,
    atcVersion: string
): RawSubstanceConsumptionCalculated[] {
    logger.info(
        `Starting the calculation of consumption product level data for organisation ${orgUnitId} and period ${period}`
    );

    const dddCombinations = atcClassification?.ddd_combinations;
    const dddData = atcClassification?.ddd;
    const dddAlterations = atcClassification?.ddd_alterations;
    const conversionFactorData = atcClassification?.conversion;

    const contentDDDPerProductAndDDDPerPackage: ContentDDDPerProductAndDDDPerPackage[] = teiInstancesData
        .map((product: ProductRegistryAttributes) => {
            logger.debug(`Calculating content, ddd and  ddd_per_pack of product: ${JSON.stringify(product)}`);
            // 1 - Calculate the content per product = content
            const content = calculateContentPerProduct(product);
            if (content) {
                // 2 - Identify corresponding DDD per product = ddd
                const dddPerProduct = calculateDDDPerProduct(product, dddCombinations, dddData, dddAlterations);
                // 3 - Calculate DDD per package = ddd_per_pack
                const dddPerPackage = calculateDDDPerPackage(product, content, dddPerProduct, conversionFactorData);

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
            conversionFactorData,
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
function calculateContentPerProduct(product: ProductRegistryAttributes): Content | undefined {
    logger.info(`Calculating content of product: ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`);
    const {
        AMR_GLASS_AMC_TEA_STRENGTH,
        AMR_GLASS_AMC_TEA_STRENGTH_UNIT,
        AMR_GLASS_AMC_TEA_CONC_VOLUME: maybeConcVolume,
        AMR_GLASS_AMC_TEA_CONC_VOLUME_UNIT: maybeConcVolumeUnit,
        AMR_AMC_TEA_VOLUME: maybeVolume,
        AMR_AMC_TEA_VOLUME_UNIT: maybeVolumeUnit,
        AMR_GLASS_AMC_TEA_PACKSIZE,
    } = product;

    if (
        (isStrengthUnitValid(AMR_GLASS_AMC_TEA_STRENGTH_UNIT) && (!maybeConcVolumeUnit || !maybeVolumeUnit)) ||
        (isStrengthUnitValid(AMR_GLASS_AMC_TEA_STRENGTH_UNIT) &&
            isConcVolumeUnitOrVolumeUnitValid(maybeConcVolumeUnit) &&
            isConcVolumeUnitOrVolumeUnitValid(maybeVolumeUnit))
    ) {
        const standardizedStrength: number = valueToStandardizedMeasurementUnit(
            AMR_GLASS_AMC_TEA_STRENGTH,
            AMR_GLASS_AMC_TEA_STRENGTH_UNIT
        );
        const standarizedStrengthUnit: Unit = UNITS_TO_STANDARDIZED_MEASUREMENT_UNIT[AMR_GLASS_AMC_TEA_STRENGTH_UNIT];

        const standardizedConcVolume: number = concVolumeOrVolumeUnitToStandardizedMeasurementUnit(
            maybeConcVolume,
            maybeConcVolumeUnit
        );

        const standardizedVolume: number = concVolumeOrVolumeUnitToStandardizedMeasurementUnit(
            maybeVolume,
            maybeVolumeUnit
        );

        // 1d - content = standardized_strength × (standardized_volume ÷ standardized_conc_volume) × packsize
        const content =
            standardizedStrength * (standardizedVolume / standardizedConcVolume) * AMR_GLASS_AMC_TEA_PACKSIZE;

        logger.debug(`Content of product: ${content} ${standarizedStrengthUnit}`);
        return {
            value: content,
            standarizedStrengthUnit,
        };
    } else {
        logger.error(
            `Content of product cannot be calculated. Strength unit, concentration volume unit or volume unit not valid of product: ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`
        );
    }
}

// 1b
function concVolumeOrVolumeUnitToStandardizedMeasurementUnit(
    concVolumeOrVolume?: number,
    concVolumeUnitOrVolumeUnit?: Unit
): number {
    // 1c
    if (!concVolumeOrVolume || !concVolumeUnitOrVolumeUnit) {
        return 1;
    }
    return valueToStandardizedMeasurementUnit(concVolumeOrVolume, concVolumeUnitOrVolumeUnit);
}

// 2 - Identify corresponding DDD per product
function calculateDDDPerProduct(
    product: ProductRegistryAttributes,
    dddCombinations: DDDCombinationsData[] | undefined,
    dddData: DDDData[] | undefined,
    dddAlterations: DDDAlterationsData[] | undefined
): DDDPerProduct | undefined {
    logger.info(`Identifying corresponding ddd_value and ddd_unit of product: ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`);

    const { AMR_GLASS_AMC_TEA_COMBINATION } = product;

    return AMR_GLASS_AMC_TEA_COMBINATION
        ? getDDDOfProductFromDDDCombinationsTable(AMR_GLASS_AMC_TEA_COMBINATION, dddCombinations)
        : getDDDOfProductFromDDDTable(product, dddData, dddAlterations);
}

// 2b
function getDDDOfProductFromDDDCombinationsTable(
    AMR_GLASS_AMC_TEA_COMBINATION: string,
    dddCombinations: DDDCombinationsData[] | undefined
): DDDPerProduct | undefined {
    logger.info(
        `Identifying corresponding ddd_value and ddd_unit from ddd_combinations json using: ${AMR_GLASS_AMC_TEA_COMBINATION}`
    );

    const codeCombinationData = dddCombinations?.find(({ COMB_CODE }) => COMB_CODE === AMR_GLASS_AMC_TEA_COMBINATION);

    if (codeCombinationData) {
        const { DDD: DDD_VALUE, DDD_UNIT } = codeCombinationData;
        logger.debug(`DDD data found in ddd_combinations json: ${DDD_VALUE} ${UNITS_MAPPING[DDD_UNIT]}`);

        return {
            dddValue: DDD_VALUE,
            dddUnit: UNITS_MAPPING[DDD_UNIT] as Unit,
        };
    } else {
        logger.error(`Combination code not found in ddd_combinations json: ${AMR_GLASS_AMC_TEA_COMBINATION}`);
    }
}

// 2c
function getDDDOfProductFromDDDTable(
    product: ProductRegistryAttributes,
    dddData: DDDData[] | undefined,
    dddAlterations: DDDAlterationsData[] | undefined
): DDDPerProduct | undefined {
    const { AMR_GLASS_AMC_TEA_ATC, AMR_GLASS_AMC_TEA_ROUTE_ADMIN, AMR_GLASS_AMC_TEA_SALT } = product;
    logger.info(
        `Identifying corresponding ddd_value and ddd_unit from ddd json for ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID} using: ${AMR_GLASS_AMC_TEA_ATC}, ${AMR_GLASS_AMC_TEA_ROUTE_ADMIN} and ${AMR_GLASS_AMC_TEA_SALT}`
    );

    const dddDataFound = dddData?.find(({ ATC5, SALT, ROA }) => {
        const isDefaultSalt = !SALT && AMR_GLASS_AMC_TEA_SALT === SALT_MAPPING.default;
        return (
            ATC5 === AMR_GLASS_AMC_TEA_ATC &&
            ROUTE_OF_ADMINISTRATION_MAPPING[ROA] === AMR_GLASS_AMC_TEA_ROUTE_ADMIN &&
            ((SALT && SALT_MAPPING[SALT] === AMR_GLASS_AMC_TEA_SALT) || isDefaultSalt)
        );
    });

    if (dddDataFound) {
        const dddUnit = UNITS_MAPPING[dddDataFound.DDD_UNIT] as Unit;
        const dddStandardizedUnit = UNITS_TO_STANDARDIZED_MEASUREMENT_UNIT[dddUnit] as Unit;
        logger.debug(`DDD data found in ddd json: ${dddDataFound.DDD_STD} ${dddStandardizedUnit}`);
        return {
            dddValue: dddDataFound.DDD_STD,
            dddUnit: dddStandardizedUnit,
        };
    }
    logger.warn(`DDD data not found in ddd json of product: ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`);

    const newDddData = dddAlterations?.find(
        ({ CURRENT_ATC, NEW_ROUTE, DELETED }) =>
            !DELETED &&
            CURRENT_ATC === AMR_GLASS_AMC_TEA_ATC &&
            NEW_ROUTE &&
            ROUTE_OF_ADMINISTRATION_MAPPING[NEW_ROUTE] === AMR_GLASS_AMC_TEA_ROUTE_ADMIN
    );

    if (newDddData) {
        const dddUnit = UNITS_MAPPING[newDddData.NEW_DDD_UNIT] as Unit;
        const dddStandardizedValue = valueToStandardizedMeasurementUnit(newDddData.NEW_DDD, dddUnit);
        const dddStandardizedUnit = UNITS_TO_STANDARDIZED_MEASUREMENT_UNIT[dddUnit] as Unit;
        logger.warn(`DDD data found in ddd_alterations json: ${dddStandardizedValue} ${dddStandardizedUnit}`);

        return {
            dddValue: dddStandardizedValue,
            dddUnit: dddStandardizedUnit,
        };
    }
    logger.error(`DDD data not found in ddd_alterations json of product: ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`);
    logger.debug(`DDD data not found in ddd_alterations json of product: ${JSON.stringify(product)}`);
}

// 3 - Calculate DDD per package
function calculateDDDPerPackage(
    product: ProductRegistryAttributes,
    content: Content,
    dddPerProduct: DDDPerProduct | undefined,
    conversionFactorData: ConversionFactorData[] | undefined
): DDDPerPackage | undefined {
    logger.info(`Calculating ddd per package of product: ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`);

    if (dddPerProduct) {
        const { AMR_GLASS_AMC_TEA_ATC, AMR_GLASS_AMC_TEA_ROUTE_ADMIN } = product;

        const { standarizedStrengthUnit } = content;

        const conversionFactorAtc = conversionFactorData?.find(
            ({ ATC5, ROA }) =>
                ATC5 === AMR_GLASS_AMC_TEA_ATC && ROUTE_OF_ADMINISTRATION_MAPPING[ROA] === AMR_GLASS_AMC_TEA_ROUTE_ADMIN
        );

        // 3a
        const conversionFactor =
            standarizedStrengthUnit !== dddPerProduct.dddUnit && conversionFactorAtc?.FACTOR
                ? conversionFactorAtc.FACTOR
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
        const { AMR_GLASS_AMC_TEA_PRODUCT_ID, packages_det, health_sector_manual, health_level_manual } =
            productConsumption;

        // 4b - ddd_cons_product = ddd_per_pack × packages (in year, health_sector and health_level)
        const dddConsumptionPackages = dddPerPackage.value * packages_det;
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
    conversionFactorData: ConversionFactorData[] | undefined
): ContentTonnesPerProduct {
    logger.info(`Calculating content tonnes of product ${product.AMR_GLASS_AMC_TEA_PRODUCT_ID}`);
    logger.debug(
        `Calculating content tonnes of product: ${JSON.stringify(product)} and ${JSON.stringify(productConsumption)}`
    );

    const { AMR_GLASS_AMC_TEA_PRODUCT_ID: teiIdProduct, AMR_GLASS_AMC_TEA_ATC } = product;
    const { packages_det, health_sector_manual, health_level_manual } = productConsumption;

    const { standarizedStrengthUnit: contentUnit } = content;
    // 5a
    const conversionFactorAtc = conversionFactorData?.find(({ ATC5 }) => ATC5 === AMR_GLASS_AMC_TEA_ATC);
    const conversionFactor = contentUnit !== "gram" && conversionFactorAtc?.FACTOR ? conversionFactorAtc.FACTOR : 1;
    logger.debug(`Conversion factor used to calculate content_tonnes: ${conversionFactor}`);

    // 5b - content_tonnes = (content × conv_factor × packages in the year, health_sector and health_level) ÷ 1e6
    logger.debug(`Content tonnes: ${(content.value * conversionFactor * packages_det) / 1e6}`);
    return {
        AMR_GLASS_AMC_TEA_PRODUCT_ID: teiIdProduct,
        year: period,
        health_sector_manual,
        health_level_manual,
        contentTonnes: (content.value * conversionFactor * packages_det) / 1e6,
    };
}

// Given 1&2&3 calculates 4, 5, 6, 7, 8
function aggregateDataByAtcRouteAdminYearHealthSectorAndHealthLevel(
    period: string,
    orgUnitId: Id,
    teiInstancesData: ProductRegistryAttributes[],
    rawProductConsumptionData: RawProductConsumption[],
    contentDDDPerProductAndDDDPerPackage: ContentDDDPerProductAndDDDPerPackage[],
    conversionFactorData: ConversionFactorData[] | undefined,
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
                        conversionFactorData
                    );

                    const {
                        AMR_GLASS_AMC_TEA_PRODUCT_ID,
                        AMR_GLASS_AMC_TEA_SALT,
                        AMR_GLASS_AMC_TEA_ATC,
                        AMR_GLASS_AMC_TEA_ROUTE_ADMIN,
                    } = product;
                    const { packages_det, data_status_manual, health_sector_manual, health_level_manual } =
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

                    return {
                        ...acc,
                        [id]: isAlreadyInTheAggregation
                            ? {
                                  ...accWithThisId,
                                  tons_autocalculated:
                                      accWithThisId.tons_autocalculated + contentTonnesOfProduct.contentTonnes,
                                  packages_autocalculated: accWithThisId.packages_autocalculated + packages_det,
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
                                  packages_autocalculated: packages_det,
                                  tons_autocalculated: contentTonnesOfProduct.contentTonnes,
                                  ddds_autocalculated: dddPerProductConsumptionPackages.dddConsumptionPackages,
                                  data_status_autocalculated: data_status_manual,
                                  health_sector_autocalculated: health_sector_manual,
                                  atc_version_autocalculated: atcVersion,
                                  health_level_autocalculated: health_level_manual,
                                  orgUnitId,
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
