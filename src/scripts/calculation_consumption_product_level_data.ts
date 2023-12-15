import { command, run, string, option } from "cmd-ts";
import path from "path";
import * as XLSX from "xlsx";
import * as fs from "fs";
import ATC_2023_v1 from "./ATC-2023-v1.json";

// npx ts-node src/scripts/calculation_consumption_product_level_data.ts -e /home/ana/Documents/AMC/TO_TEST_Product_Register_test_ZWE.xlsx

// FROM JSON OR FROM DataStore
type DDDCombination = {
    COMB_CODE: string;
    ARS: string;
    ATC5: string;
    FORM: string;
    ROUTE: string;
    SUBSTANCES: string;
    DDD: number;
    DDD_UNIT: string;
    DDD_INFO: string;
    EXAMPLE: string;
};
type DDDType = {
    ARS: string;
    ATC5: string;
    ROA: string;
    SALT?: string;
    DDD: number;
    DDD_UNIT: string;
    DDD_STD: number;
    NOTES?: string;
};

type ConversionFactor = {
    ARS: string;
    ATC5: string;
    ROA: string;
    UNIT_FROM: string;
    UNIT_TO: string;
    FACTOR: number;
};

// Get ATC_2023_v1 from DataStore

const DDD_COMBINATIONS_NAME = "ddd_combinations";
const DDD_NAME = "ddd";
const CONVERSION_NAME = "conversion";

const DDD_COMBINATIONS: DDDCombination[] = ATC_2023_v1.find(({ name }) => name === DDD_COMBINATIONS_NAME)
    ?.data as DDDCombination[];
const DDD: DDDType[] = ATC_2023_v1.find(({ name }) => name === DDD_NAME)?.data as DDDType[];
const CONVERSION_FACTOR: ConversionFactor[] = ATC_2023_v1.find(({ name }) => name === CONVERSION_NAME)
    ?.data as ConversionFactor[];

// TYPES AND INTERFACES

type Unit =
    | "gram"
    | "milligram"
    | "international unit"
    | "millions international unit"
    | "unit dose"
    | "milliliter"
    | "liter";

type RouteOfAdmin = "oral" | "parenteral" | "rectal" | "inhalation power" | "inhalation solution";
type Salt = "hippurate" | "ethylsuccinate" | "mandelate" | "default";

type Content = {
    content: number;
    standarizedStrengthUnit: Unit;
};

type DDDPerProduct = {
    dddValue: number;
    dddUnit: Unit;
};

type DDDPerPackage = {
    value: number;
    dddUnit: string;
};

type ContentDDDPerProductAndDDDPerPackage = {
    teiId: string;
    contentPerProduct: Content;
    dddPerProduct: DDDPerProduct;
    dddPerPackage: DDDPerPackage;
};

type DDDPerProductConsumptionPackages = {
    teiId: string;
    year: number;
    healthSector: string;
    healthLevel: string;
    dddConsumptionPackages: number;
    dddUnit: string;
};

type ContentTonnesPerProduct = {
    teiId: string;
    contentTonnes: number;
};

type ContentTonnesPerATC = {
    teiId: string;
    atcCode: string;
    routeAdmin: string;
    year: number;
    healthSector: string;
    healthLevel: string;
    contentTonnes: number;
};

type AggregatedCalculations = {
    teiId: string;
    atcCode: string;
    routeAdmin: string;
    salt: Salt;
    year: number;
    healthSector: string;
    healthLevel: string;
    tonnes: number;
    packages: number;
    ddd_cons_product: number;
    dddPerProduct: DDDPerProduct;
    dddPerPackage: DDDPerPackage;
};

// DICTIONARIES AND MAPPINGS

const TEI_INSTANCES_HEADERS = {
    TEI_ID: "TEI id",
    ORG_UNIT: "Org Unit *",
    NO_GEOMETRY: "No geometry",
    ENROLLMENT_DATE: "Enrollment Date *\r\n(YYYY-MM-DD)",
    INCIDENT_DATE: "Incident Date\r\n(YYYY-MM-DD)",
    PRODUCT_NAME: "Product name",
    LABEL: "Label",
    PACKAGE_SIZE: "Package size",
    STRENGTH: "Strength",
    STRENGTH_UNIT: "Strength unit",
    CONCENTRATION_VOLUME: "Concentration volume",
    CONCENTRATION_VOLUME_UNIT: "Concentration volume unit",
    VOLUME: "Volume",
    VOLUME_UNIT: "Volume unit",
    ATC_CODE: "ATC Code",
    COMBINATION_CODE: "Combination Code",
    ROUTE_OF_ADMINISTRATION: "Route of administration",
    SALT: "Salt",
    IS_IT_A_PAEDIATRIC_PRODUCT: "Is it a paediatric product?",
    FORMNAME: "formName",
    INGREDIENTS: "Ingredients",
    PRODUCT_ORIGIN: "Product origin",
    MANUFACTURER_COUNTRY: "Manufacturer country",
    MARKETING_AUTHORIZATION_HOLDER: "Marketing authorization holder",
    IS_IT_A_GENERIC_PRODUCT: "Is it a generic product?",
    AUTHORIZATION_YEAR: "Authorization year",
    WITHDRAWAL_YEAR: "Withdrawal year",
    DATA_STATUS: "Data status",
};

const RAW_PRODUCT_CONSUMPTION_HEADERS = {
    EVENT_ID: "Event id",
    TEI_ID: "TEI Id",
    OPTIONS: "Options",
    DATE: "Date *\r\n(YYYY-MM-DD)",
    PACKAGES: "Packages *",
    DATA_STATUS_MANUAL: "Data status manual *",
    HEALTH_SECTOR_MANUAL: "Health Sector manual *",
    HEALTH_LEVEL_MANUAL: "Health Level manual *",
};

const UNITS: Record<string, Unit> = {
    GRAM: "gram",
    MILLIGRAM: "milligram",
    INTERNATIONAL_UNIT: "international unit",
    MILLIONS_INTERNATIONAL_UNIT: "millions international unit",
    UNIT_DOSE: "unit dose",
    MILLILITER: "milliliter",
    LITER: "liter",
};

const GRAM_FAMILY = [UNITS.GRAM, UNITS.MILLIGRAM];
const INTERNATIONAL_UNIT_FAMILY = [UNITS.INTERNATIONAL_UNIT, UNITS.MILLIONS_INTERNATIONAL_UNIT];
const UNIT_DOSE_FAMILY = [UNITS.UNIT_DOSE];
const LITER_FAMILY = [UNITS.LITER, UNITS.MILLILITER];

const VALID_STRENGTH_UNITS = [...GRAM_FAMILY, ...INTERNATIONAL_UNIT_FAMILY, ...UNIT_DOSE_FAMILY];

const UNITS_TO_STANDARDIZED_MEASUREMENT_UNIT = {
    [UNITS.MILLIGRAM]: UNITS.GRAM,
    [UNITS.GRAM]: UNITS.GRAM,
    [UNITS.INTERNATIONAL_UNIT]: UNITS.MILLIONS_INTERNATIONAL_UNIT,
    [UNITS.MILLIONS_INTERNATIONAL_UNIT]: UNITS.MILLIONS_INTERNATIONAL_UNIT,
    [UNITS.UNIT_DOSE]: UNITS.UNIT_DOSE,
    [UNITS.MILLILITER]: UNITS.MILLILITER,
    [UNITS.LITER]: UNITS.MILLILITER,
};

const CONVERSION_TO_STANDARDIZED_MEASUREMENT_UNIT = {
    [UNITS.MILLIGRAM]: 0.001,
    [UNITS.GRAM]: 1,
    [UNITS.INTERNATIONAL_UNIT]: 0.000001,
    [UNITS.MILLIONS_INTERNATIONAL_UNIT]: 1,
    [UNITS.UNIT_DOSE]: 1,
    [UNITS.MILLILITER]: 1,
    [UNITS.LITER]: 1000,
};

const UNITS_MAPPING: Record<string, Unit> = {
    G: UNITS.GRAM,
    MG: UNITS.MILLIGRAM,
    IU: UNITS.INTERNATIONAL_UNIT,
    MU: UNITS.MILLIONS_INTERNATIONAL_UNIT,
    UD: UNITS.UNIT_DOSE,
    L: UNITS.LITER,
    ML: UNITS.MILLILITER,
};

const ROUTE_OF_ADMINISTRATION_MAPPING: Record<string, RouteOfAdmin> = {
    O: "oral",
    P: "parenteral",
    R: "rectal",
    IP: "inhalation power",
    IS: "inhalation solution",
};

const SALT_MAPPING: Record<string, Salt> = {
    HIPP: "hippurate",
    ESUC: "ethylsuccinate",
    MAND: "mandelate",
    default: "default",
};

function getJsonDataFromSheet(workbook: XLSX.WorkBook, sheetName: string): any[][] {
    const sheet = workbook.Sheets[sheetName];
    if (sheet) {
        const jsonDataNotClean = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: null,
            dateNF: "yyyy-mm-dd",
        });
        return jsonDataNotClean as any[][];
    } else {
        throw new Error(`Sheet ${sheetName} not found`);
    }
}

function getCleanJsonData(jsonDataNotClean: any[][], slice: number): any[][] {
    const cleanJsonData = jsonDataNotClean.slice(slice);
    return cleanJsonData;
}

function writeToFile(dataToWrite: Record<string, any>, fileName: string): void {
    fs.writeFileSync(`src/scripts/${fileName}.json`, JSON.stringify(dataToWrite, null, 2), "utf-8");
}

// Around 5 minutes
const NUMBER_OF_ITERATIONS = 10000;

function main() {
    const cmd = command({
        name: path.basename(__filename),
        description: "",
        args: {
            excelFilePath: option({
                type: string,
                long: "excel-file",
                short: "e",
                description: "Excel file",
            }),
        },
        handler: async args => {
            const { excelFilePath } = args;
            if (!excelFilePath) {
                console.error("Excel file not found");
                process.exit(1);
            }

            for (let i = 1; i <= NUMBER_OF_ITERATIONS; i++) {
                calculationConsumptionProductLevelData(excelFilePath);
                console.log("Iteration: ", i);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

main();

function calculationConsumptionProductLevelData(excelFilePath: string): void {
    const workbook = XLSX.readFile(excelFilePath, { cellDates: true });
    const tab1TEIInstancesSheetName = workbook.SheetNames[0];
    const tab2RawProductConsumptionSheetName = workbook.SheetNames[1];

    if (tab1TEIInstancesSheetName && tab2RawProductConsumptionSheetName) {
        // TEI Instances tab
        const jsonDataTEIInstancesNotClean = getJsonDataFromSheet(workbook, tab1TEIInstancesSheetName);
        const jsonDataTEIInstances = getCleanJsonData(jsonDataTEIInstancesNotClean, 5);
        // console.log("jsonDataTEIInstances", jsonDataTEIInstances);

        const contentDDDPerProductAndDDDPerPackage: ContentDDDPerProductAndDDDPerPackage[] = jsonDataTEIInstances.map(
            (product): any => {
                const positionTeiId = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.TEI_ID);
                const teiId: string = (product as any[])[positionTeiId].toString();

                // 1 - Calculate the content per product = content
                const contentPerProduct = calculateContentPerProduct(product as any[]);
                // 2 - Identify corresponding DDD per product = ddd
                const dddPerProduct = calculateDDDPerProduct(product as any[]);
                // 3 - Calculate DDD per package = ddd_per_pack
                const dddPerPackage = getDDDPerPackage(product as any[], contentPerProduct, dddPerProduct);

                return {
                    teiId,
                    contentPerProduct,
                    dddPerProduct,
                    dddPerPackage,
                };
            }
        );

        writeToFile({ contentDDDPerProductAndDDDPerPackage }, "1&2&3 - contentDDDPerProductAndDDDPerPackage");

        // AMC - Raw Product Consumption tab
        const jsonDataRawProductConsumptionNotClean = getJsonDataFromSheet(
            workbook,
            tab2RawProductConsumptionSheetName
        );
        const jsonDataRawProductConsumption = getCleanJsonData(jsonDataRawProductConsumptionNotClean, 2);
        // console.log("jsonDataRawProductConsumption", jsonDataRawProductConsumption);

        // 4 - Calculate DDD per product consumption packages = ddd_cons_product
        const dddPerProductConsumptionPackages: DDDPerProductConsumptionPackages[] = jsonDataRawProductConsumption.map(
            (productConsumption): any => {
                return getDDDPerProductConsumptionPackages(
                    productConsumption as any[],
                    contentDDDPerProductAndDDDPerPackage
                );
            }
        );

        writeToFile({ dddPerProductConsumptionPackages }, "4 - dddPerProductConsumptionPackages");

        // 5 - Calculate tonnes per ATC5 (using content from step 1) = content_tonnes
        const contentTonnesPerATCUsingContent = aggregateContentTonnesUsingContent(
            jsonDataTEIInstances,
            jsonDataRawProductConsumption,
            contentDDDPerProductAndDDDPerPackage
        );
        writeToFile({ contentTonnesPerATCUsingContent }, "5 - contentTonnesPerATCUsingContent");

        // 5 - Calculate tonnes per ATC5 (using DDD per product consumption packages from step 4) = content_tonnes
        const contentTonnesPerATCUsingDDDPerConsuptionPackages = aggregateContentTonnesUsingDDDPerConsuptionPackages(
            jsonDataTEIInstances,
            jsonDataRawProductConsumption,
            dddPerProductConsumptionPackages
        );
        writeToFile(
            { contentTonnesPerATCUsingDDDPerConsuptionPackages },
            "5 - contentTonnesPerATCUsingDDDPerConsuptionPackages"
        );

        // 5c, 6a, 7a, 8a
        const dataByAtcRouteAdminYearHealthSectorAndHealthLevel =
            aggregateDataByAtcRouteAdminYearHealthSectorAndHealthLevel(
                jsonDataTEIInstances,
                jsonDataRawProductConsumption,
                contentDDDPerProductAndDDDPerPackage
            );
        writeToFile(
            { dataByAtcRouteAdminYearHealthSectorAndHealthLevel },
            "LAST - aggregateDataByAtcRouteAdminYearHealthSectorAndHealthLevel"
        );
    }
}

// 1 - Calculate the content per product
function calculateContentPerProduct(product: any[]): Content {
    const positionStrength = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.STRENGTH);
    const strength: number = product[positionStrength];

    const positionStrengthUnit = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.STRENGTH_UNIT);
    const strengthUnit: Unit = product[positionStrengthUnit];

    const positionConcVolume = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.CONCENTRATION_VOLUME);
    const maybeConcVolume: number = product[positionConcVolume];

    const positionConcVolumeUnit = Object.values(TEI_INSTANCES_HEADERS).indexOf(
        TEI_INSTANCES_HEADERS.CONCENTRATION_VOLUME_UNIT
    );
    const maybeConcVolumeUnit: Unit = product[positionConcVolumeUnit];

    const positionVolume = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.VOLUME);
    const maybeVolume: number = product[positionVolume];

    const positionVolumeUnit = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.VOLUME_UNIT);
    const maybeVolumeUnit: Unit = product[positionVolumeUnit];

    if (
        (isStrengthUnitValid(strengthUnit) && !maybeConcVolumeUnit && !maybeVolumeUnit) ||
        (isStrengthUnitValid(strengthUnit) &&
            isConcVolumeUnitOrVolumeUnitValid(maybeConcVolumeUnit) &&
            isConcVolumeUnitOrVolumeUnitValid(maybeVolumeUnit))
    ) {
        const standardizedStrength: number = strengthUnitToStandardizedMeasurementUnit(strength, strengthUnit);
        const standarizedStrengthUnit: Unit = UNITS_TO_STANDARDIZED_MEASUREMENT_UNIT[strengthUnit];

        const standardizedConcVolume: number = concVolumeOrVolumeUnitToStandardizedMeasurementUnit(
            maybeConcVolume,
            maybeConcVolumeUnit
        );

        const standardizedVolume: number = concVolumeOrVolumeUnitToStandardizedMeasurementUnit(
            maybeVolume,
            maybeVolumeUnit
        );

        const positionPackSize: number = Object.values(TEI_INSTANCES_HEADERS).indexOf(
            TEI_INSTANCES_HEADERS.PACKAGE_SIZE
        );
        const packSize: number = product[positionPackSize];

        // 1d - content = standardized_strength × (standardized_volume ÷ standardized_conc_volume) × packsize
        const content = standardizedStrength * (standardizedVolume / standardizedConcVolume) * packSize;
        return {
            content,
            standarizedStrengthUnit,
        };
    } else {
        throw new Error(
            `Unit of ${product} not valid. strengthUnit: ${strengthUnit}, concVolumeUnit: ${maybeConcVolumeUnit}, , concVolumeUnit: ${maybeVolumeUnit}`
        );
    }
}

// 1a
function isStrengthUnitValid(strengthUnit: Unit): boolean {
    return VALID_STRENGTH_UNITS.includes(strengthUnit);
}

// 1a
function isConcVolumeUnitOrVolumeUnitValid(concVolumeUnit: Unit): boolean {
    return LITER_FAMILY.includes(concVolumeUnit);
}

// 1b
function strengthUnitToStandardizedMeasurementUnit(strength: number, strength_unit: string): number {
    return strength * CONVERSION_TO_STANDARDIZED_MEASUREMENT_UNIT[strength_unit];
}

// 1b
function concVolumeOrVolumeUnitToStandardizedMeasurementUnit(
    concVolumeOrVolume?: number,
    concVolumeUnitOrVolumeUnit?: string
): number {
    // 1c
    if (!concVolumeOrVolume || !concVolumeUnitOrVolumeUnit) {
        return 1;
    }
    return concVolumeOrVolume * CONVERSION_TO_STANDARDIZED_MEASUREMENT_UNIT[concVolumeUnitOrVolumeUnit];
}

// 2 - Identify corresponding DDD per product
function calculateDDDPerProduct(product: any[]): DDDPerProduct {
    const positionCombinationCode = Object.values(TEI_INSTANCES_HEADERS).indexOf(
        TEI_INSTANCES_HEADERS.COMBINATION_CODE
    );
    const combinationCode: string = product[positionCombinationCode];

    return combinationCode
        ? getDDDOfProductFromDDDCombinationsTable(combinationCode)
        : getDDDOfProductFromDDDTable(product);
}

// 2b
function getDDDOfProductFromDDDCombinationsTable(combinationCode: string): DDDPerProduct {
    const codeCombinationData = DDD_COMBINATIONS.find(({ COMB_CODE }) => COMB_CODE === combinationCode);
    if (codeCombinationData) {
        const { DDD: DDD_VALUE, DDD_UNIT } = codeCombinationData;
        return {
            dddValue: DDD_VALUE,
            dddUnit: UNITS_MAPPING[DDD_UNIT],
        };
    } else {
        throw new Error(`Combination code ${combinationCode} not valid.`);
    }
}

// 2c
function getDDDOfProductFromDDDTable(product: any[]): DDDPerProduct {
    const positionAtcCode = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.ATC_CODE);
    const positionRouteAdmin = Object.values(TEI_INSTANCES_HEADERS).indexOf(
        TEI_INSTANCES_HEADERS.ROUTE_OF_ADMINISTRATION
    );
    const positionSalt = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.SALT);

    const atcCode: string = product[positionAtcCode];
    const routeAdmin: RouteOfAdmin = product[positionRouteAdmin];
    const salt: Salt = product[positionSalt];

    const dddData = DDD.find(({ ATC5, SALT, ROA }) => {
        const isDefaultSalt = !SALT && salt === SALT_MAPPING.default;
        return (
            ATC5 === atcCode &&
            ROUTE_OF_ADMINISTRATION_MAPPING[ROA] === routeAdmin &&
            ((SALT && SALT_MAPPING[SALT] === salt) || isDefaultSalt)
        );
    });

    if (dddData) {
        const { DDD_STD, DDD_UNIT } = dddData;
        const dddUnit = UNITS_MAPPING[DDD_UNIT];
        const dddStandardizedUnit = UNITS_TO_STANDARDIZED_MEASUREMENT_UNIT[dddUnit];
        return {
            dddValue: DDD_STD,
            dddUnit: dddStandardizedUnit,
        };
    } else {
        throw new Error(
            `No DDD data found for ATC - ${atcCode}, route of administration - ${routeAdmin} and salt - ${salt}.`
        );
    }
}

// 3 - Calculate DDD per package
function getDDDPerPackage(product: any[], contentPerProduct: Content, dddPerProduct: DDDPerProduct): DDDPerPackage {
    const standarizedStrengthUnit: Unit = contentPerProduct.standarizedStrengthUnit;

    const positionAtcCode = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.ATC_CODE);
    const atcCode: string = (product as any[])[positionAtcCode];
    const conversionFactorAtc = CONVERSION_FACTOR.find(({ ATC5 }) => ATC5 === atcCode);

    // 3a
    const conversionFactor =
        standarizedStrengthUnit !== dddPerProduct.dddUnit && conversionFactorAtc?.FACTOR
            ? conversionFactorAtc.FACTOR
            : 1;

    // 3b - ddd_per_pack = content × conv_factor ÷ ddd_value
    return {
        value: (contentPerProduct.content * conversionFactor) / dddPerProduct.dddValue,
        dddUnit: dddPerProduct.dddUnit,
    };
}

// 4 - Calculate DDD per product consumption packages
function getDDDPerProductConsumptionPackages(
    productConsumption: any[],
    contentDDDPerProductAndDDDPerPackage: ContentDDDPerProductAndDDDPerPackage[]
): DDDPerProductConsumptionPackages {
    const positionTeiId = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
        RAW_PRODUCT_CONSUMPTION_HEADERS.TEI_ID
    );
    const teiId: string = (productConsumption as any[])[positionTeiId].toString();

    const positionDate = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(RAW_PRODUCT_CONSUMPTION_HEADERS.DATE);
    const date: Date = (productConsumption as any[])[positionDate];

    const positionPackages = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
        RAW_PRODUCT_CONSUMPTION_HEADERS.PACKAGES
    );
    const packages: number = (productConsumption as any[])[positionPackages];

    const positionHealthSector = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
        RAW_PRODUCT_CONSUMPTION_HEADERS.HEALTH_SECTOR_MANUAL
    );
    const healthSector: string = (productConsumption as any[])[positionHealthSector].toString();

    const positionHealthLevel = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
        RAW_PRODUCT_CONSUMPTION_HEADERS.HEALTH_LEVEL_MANUAL
    );
    const healthLevel: string = (productConsumption as any[])[positionHealthLevel].toString();

    const dddPerPackage = contentDDDPerProductAndDDDPerPackage.find(
        productData => productData.teiId === teiId
    )?.dddPerPackage;

    if (dddPerPackage) {
        // 4b - ddd_cons_product = ddd_per_pack × packages (per year, health_sector and health_level)
        const dddConsumptionPackages = dddPerPackage.value * packages;
        return {
            teiId,
            year: date.getFullYear(),
            healthSector,
            healthLevel,
            dddConsumptionPackages,
            dddUnit: dddPerPackage.dddUnit,
        };
    } else {
        throw new Error(`DDD per package (${dddPerPackage}) for product ${teiId} not found.`);
    }
}

// --------------------------------------- Option 1: using content
// 5b - Calculate tonnes per product
function getTonnesPerProductUsingContent(
    product: any[],
    contentDDDPerProductAndDDDPerPackage: ContentDDDPerProductAndDDDPerPackage[]
): ContentTonnesPerProduct {
    const positionTeiId = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.TEI_ID);
    const teiIdProduct: string = product[positionTeiId].toString();

    const positionAtcCode = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.ATC_CODE);
    const atcCode = product[positionAtcCode];

    const contentDDDPerProductAndDDDPerPackageOfProduct = contentDDDPerProductAndDDDPerPackage.find(
        ({ teiId }) => teiIdProduct === teiId
    );

    if (contentDDDPerProductAndDDDPerPackageOfProduct) {
        const { content, standarizedStrengthUnit } = contentDDDPerProductAndDDDPerPackageOfProduct?.contentPerProduct;
        // 5a
        const conversionFactorAtc = CONVERSION_FACTOR.find(({ ATC5 }) => ATC5 === atcCode);
        const contentUnit = standarizedStrengthUnit;
        const conversionFactor =
            contentUnit !== UNITS.GRAM && conversionFactorAtc?.FACTOR ? conversionFactorAtc.FACTOR : 1;

        // 5b - content_tonnes = content × conv_factor ÷ 1e6
        return {
            teiId: teiIdProduct,
            contentTonnes: (content * conversionFactor) / 1e6,
        };
    } else {
        throw new Error(`Content of product ${teiIdProduct} not found.`);
    }
}

// 5c
function aggregateContentTonnesUsingContent(
    jsonDataTEIInstances: any[][],
    jsonDataRawProductConsumption: any[][],
    contentDDDPerProductAndDDDPerPackage: ContentDDDPerProductAndDDDPerPackage[]
): Record<string, ContentTonnesPerATC> {
    // 5b - content_tonnes = content × conv_factor ÷ 1e6
    const contentTonnesPerProductUsingContent: ContentTonnesPerProduct[] = jsonDataTEIInstances.map(
        (product: any[]) => {
            return getTonnesPerProductUsingContent(product, contentDDDPerProductAndDDDPerPackage);
        }
    );
    writeToFile({ contentTonnesPerProductUsingContent }, "5b - contentTonnesPerProductUsingContent");

    // 5c
    return jsonDataRawProductConsumption.reduce(
        (acc: Record<string, ContentTonnesPerATC>, productConsumption: any[]) => {
            const positionTeiId = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
                RAW_PRODUCT_CONSUMPTION_HEADERS.TEI_ID
            );
            const teiId: string = (productConsumption as any[])[positionTeiId].toString();

            const product = jsonDataTEIInstances.find(product => {
                const positionTeiId = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.TEI_ID);
                return teiId === product[positionTeiId].toString();
            });

            if (product) {
                const positionAtc = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.ATC_CODE);
                const positionRouteAdmin = Object.values(TEI_INSTANCES_HEADERS).indexOf(
                    TEI_INSTANCES_HEADERS.ROUTE_OF_ADMINISTRATION
                );
                const atcCode: string = product[positionAtc];
                const routeAdmin: string = product[positionRouteAdmin];

                const positionDate = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
                    RAW_PRODUCT_CONSUMPTION_HEADERS.DATE
                );
                const date: Date = (productConsumption as any[])[positionDate];
                const year: number = date.getFullYear();

                const positionHealthSector = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
                    RAW_PRODUCT_CONSUMPTION_HEADERS.HEALTH_SECTOR_MANUAL
                );
                const healthSector: string = (productConsumption as any[])[positionHealthSector].toString();

                const positionHealthLevel = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
                    RAW_PRODUCT_CONSUMPTION_HEADERS.HEALTH_LEVEL_MANUAL
                );
                const healthLevel: string = (productConsumption as any[])[positionHealthLevel].toString();

                const id = `${teiId}-${atcCode}-${routeAdmin}-${year}-${healthSector}-${healthLevel}`;

                const contentTonnesOfProduct = contentTonnesPerProductUsingContent.find(
                    contentTonnesOfProduct => contentTonnesOfProduct.teiId === teiId
                );

                if (contentTonnesOfProduct) {
                    acc[id] = acc[id]
                        ? {
                              ...acc[id],
                              contentTonnes: acc[id].contentTonnes + contentTonnesOfProduct.contentTonnes,
                          }
                        : {
                              teiId,
                              atcCode,
                              routeAdmin,
                              year,
                              healthSector,
                              healthLevel,
                              contentTonnes: contentTonnesOfProduct.contentTonnes,
                          };
                    return acc;
                } else {
                    throw new Error(`Content tonnes of product ${teiId} not found.`);
                }
            } else {
                throw new Error(`Product ${teiId} not found.`);
            }
        },
        {} as Record<string, ContentTonnesPerATC>
    );
}

// --------------------------------------- Option 2: usign ddd_cons_product
// 5b - Calculate tonnes per product
function getTonnesPerProductUsingDDDPerConsuptionPackages(
    product: any[],
    year: number,
    healthSector: string,
    healthLevel: string,
    dddPerProductConsumptionPackages: DDDPerProductConsumptionPackages[]
): ContentTonnesPerProduct {
    const positionTeiId = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.TEI_ID);
    const teiIdProduct: string = product[positionTeiId].toString();

    const positionAtcCode = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.ATC_CODE);
    const atcCode = product[positionAtcCode];

    const dddOfProductConsumptionPackages = dddPerProductConsumptionPackages.find(
        dddOfProductConsumptionPackages =>
            teiIdProduct === dddOfProductConsumptionPackages.teiId &&
            dddOfProductConsumptionPackages.year === year &&
            dddOfProductConsumptionPackages.healthSector === healthSector &&
            dddOfProductConsumptionPackages.healthLevel === healthLevel
    );

    if (dddOfProductConsumptionPackages) {
        const { dddConsumptionPackages, dddUnit } = dddOfProductConsumptionPackages;
        // 5a
        const conversionFactorAtc = CONVERSION_FACTOR.find(({ ATC5 }) => ATC5 === atcCode);
        const conversionFactor = dddUnit !== UNITS.GRAM && conversionFactorAtc?.FACTOR ? conversionFactorAtc.FACTOR : 1;
        // 5b - content_tonnes = ddd_cons_product × conv_factor ÷ 1e6
        return {
            teiId: teiIdProduct,
            contentTonnes: (dddConsumptionPackages * conversionFactor) / 1e6,
        };
    } else {
        throw new Error(`DDD of product consumption packages (${teiIdProduct}) not found.`);
    }
}

// 5c
function aggregateContentTonnesUsingDDDPerConsuptionPackages(
    jsonDataTEIInstances: any[][],
    jsonDataRawProductConsumption: any[][],
    dddPerProductConsumptionPackages: DDDPerProductConsumptionPackages[]
): Record<string, ContentTonnesPerATC> {
    // 5c
    return jsonDataRawProductConsumption.reduce(
        (acc: Record<string, ContentTonnesPerATC>, productConsumption: any[]) => {
            const positionTeiId = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
                RAW_PRODUCT_CONSUMPTION_HEADERS.TEI_ID
            );
            const teiId: string = (productConsumption as any[])[positionTeiId].toString();

            const product = jsonDataTEIInstances.find(product => {
                const positionTeiId = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.TEI_ID);
                return teiId === product[positionTeiId].toString();
            });

            if (product) {
                const positionAtc = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.ATC_CODE);
                const positionRouteAdmin = Object.values(TEI_INSTANCES_HEADERS).indexOf(
                    TEI_INSTANCES_HEADERS.ROUTE_OF_ADMINISTRATION
                );
                const atcCode: string = product[positionAtc];
                const routeAdmin: string = product[positionRouteAdmin];

                const positionDate = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
                    RAW_PRODUCT_CONSUMPTION_HEADERS.DATE
                );
                const date: Date = (productConsumption as any[])[positionDate];
                const year: number = date.getFullYear();

                const positionHealthSector = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
                    RAW_PRODUCT_CONSUMPTION_HEADERS.HEALTH_SECTOR_MANUAL
                );
                const healthSector: string = (productConsumption as any[])[positionHealthSector].toString();

                const positionHealthLevel = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
                    RAW_PRODUCT_CONSUMPTION_HEADERS.HEALTH_LEVEL_MANUAL
                );
                const healthLevel: string = (productConsumption as any[])[positionHealthLevel].toString();

                // 5b - content_tonnes = ddd_cons_product × conv_factor ÷ 1e6
                const contentTonnesOfProduct: ContentTonnesPerProduct =
                    getTonnesPerProductUsingDDDPerConsuptionPackages(
                        product,
                        year,
                        healthSector,
                        healthLevel,
                        dddPerProductConsumptionPackages
                    );

                const id = `${teiId}-${atcCode}-${routeAdmin}-${year}-${healthSector}-${healthLevel}`;

                acc[id] = acc[id]
                    ? {
                          ...acc[id],
                          contentTonnes: acc[id].contentTonnes + contentTonnesOfProduct.contentTonnes,
                      }
                    : {
                          teiId,
                          atcCode,
                          routeAdmin,
                          year,
                          healthSector,
                          healthLevel,
                          contentTonnes: contentTonnesOfProduct.contentTonnes,
                      };

                return acc;
            } else {
                throw new Error(`Product ${teiId} not found.`);
            }
        },
        {} as Record<string, ContentTonnesPerATC>
    );
}

// LAST STEP:
// 5b - Calculate tonnes per product
function getTonnesPerProduct(
    product: any[],
    dddOfProductConsumptionPackages: DDDPerProductConsumptionPackages
): ContentTonnesPerProduct {
    const positionTeiId = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.TEI_ID);
    const teiIdProduct: string = product[positionTeiId].toString();

    const positionAtcCode = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.ATC_CODE);
    const atcCode = product[positionAtcCode];

    if (dddOfProductConsumptionPackages) {
        const { dddConsumptionPackages, dddUnit } = dddOfProductConsumptionPackages;
        // 5a
        const conversionFactorAtc = CONVERSION_FACTOR.find(({ ATC5 }) => ATC5 === atcCode);
        const conversionFactor = dddUnit !== UNITS.GRAM && conversionFactorAtc?.FACTOR ? conversionFactorAtc.FACTOR : 1;
        // 5b - content_tonnes = ddd_cons_product × conv_factor ÷ 1e6
        return {
            teiId: teiIdProduct,
            contentTonnes: (dddConsumptionPackages * conversionFactor) / 1e6,
        };
    } else {
        throw new Error(`DDD of product consumption packages (${teiIdProduct}) not found.`);
    }
}

// 5c, 6a, 7a, 8a
function aggregateDataByAtcRouteAdminYearHealthSectorAndHealthLevel(
    jsonDataTEIInstances: any[][],
    jsonDataRawProductConsumption: any[][],
    contentDDDPerProductAndDDDPerPackage: ContentDDDPerProductAndDDDPerPackage[]
): Record<string, AggregatedCalculations> {
    return jsonDataRawProductConsumption.reduce(
        (acc: Record<string, AggregatedCalculations>, productConsumption: any[]) => {
            const positionTeiId = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
                RAW_PRODUCT_CONSUMPTION_HEADERS.TEI_ID
            );
            const teiId: string = (productConsumption as any[])[positionTeiId].toString();

            const product = jsonDataTEIInstances.find(product => {
                const positionTeiId = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.TEI_ID);
                return teiId === product[positionTeiId].toString();
            });

            const contentDDDPerProductAndDDDPerPackageOfProduct = contentDDDPerProductAndDDDPerPackage.find(
                productData => productData.teiId === teiId
            );

            if (product && contentDDDPerProductAndDDDPerPackageOfProduct) {
                // 2&3 - DDD per product and DDD per package
                const { dddPerProduct, dddPerPackage } = contentDDDPerProductAndDDDPerPackageOfProduct;

                // 4 - Calculate DDD per product consumption packages = ddd_cons_product
                const dddPerProductConsumptionPackages = getDDDPerProductConsumptionPackages(
                    productConsumption as any[],
                    contentDDDPerProductAndDDDPerPackage
                );

                // 5b - content_tonnes = ddd_cons_product × conv_factor ÷ 1e6
                const contentTonnesOfProduct: ContentTonnesPerProduct = getTonnesPerProduct(
                    product,
                    dddPerProductConsumptionPackages
                );

                // From product:
                const positionAtc = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.ATC_CODE);
                const positionRouteAdmin = Object.values(TEI_INSTANCES_HEADERS).indexOf(
                    TEI_INSTANCES_HEADERS.ROUTE_OF_ADMINISTRATION
                );
                const positionSalt = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.SALT);

                const atcCode: string = product[positionAtc];
                const routeAdmin: string = product[positionRouteAdmin];
                const salt: Salt = product[positionSalt];

                // From product consumption:
                const positionPackages = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
                    RAW_PRODUCT_CONSUMPTION_HEADERS.PACKAGES
                );
                const packages: number = (productConsumption as any[])[positionPackages];

                const positionDate = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
                    RAW_PRODUCT_CONSUMPTION_HEADERS.DATE
                );
                const date: Date = (productConsumption as any[])[positionDate];
                const year: number = date.getFullYear();

                const positionHealthSector = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
                    RAW_PRODUCT_CONSUMPTION_HEADERS.HEALTH_SECTOR_MANUAL
                );
                const healthSector: string = (productConsumption as any[])[positionHealthSector].toString();

                const positionHealthLevel = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
                    RAW_PRODUCT_CONSUMPTION_HEADERS.HEALTH_LEVEL_MANUAL
                );
                const healthLevel: string = (productConsumption as any[])[positionHealthLevel].toString();

                // 5c, 6a, 7a, 8a
                const id = `${teiId}-${atcCode}-${routeAdmin}-${year}-${healthSector}-${healthLevel}`;
                acc[id] = acc[id]
                    ? {
                          ...acc[id],
                          tonnes: acc[id].tonnes + contentTonnesOfProduct.contentTonnes,
                          packages: acc[id].packages + packages,
                          ddd_cons_product:
                              acc[id].ddd_cons_product + dddPerProductConsumptionPackages.dddConsumptionPackages,
                      }
                    : {
                          teiId,
                          atcCode,
                          routeAdmin,
                          salt,
                          year,
                          healthSector,
                          healthLevel,
                          tonnes: contentTonnesOfProduct.contentTonnes,
                          packages,
                          ddd_cons_product: dddPerProductConsumptionPackages.dddConsumptionPackages,
                          dddPerPackage,
                          dddPerProduct,
                      };

                return acc;
            } else {
                throw new Error(`Product ${teiId} or ddd per product and ddd per package calculations not found`);
            }
        },
        {} as Record<string, AggregatedCalculations>
    );
}
