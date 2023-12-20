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
type Product = {
    teiId: string;
    orgUnit: string;
    productId: string;
    packSize: number;
    strength: number;
    strengthUnit: Unit;
    concVolume: number;
    concVolumeUnit: Unit;
    atcCode: string;
    combinationCode: string;
    routeAdmin: RouteOfAdmin;
    salt: Salt;
    volume: number;
    volumeUnit: Unit;
};

type ProductConsumption = {
    teiId: string;
    date: Date;
    packages: number;
    dataStatus: number;
    healthSector: number;
    healthLevel: number;
};

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
    value: number;
    standarizedStrengthUnit: Unit;
};

type DDDPerProduct = {
    dddValue: number;
    dddUnit: Unit;
};

type DDDPerPackage = {
    value: number;
    dddUnit: Unit;
};

type ContentDDDPerProductAndDDDPerPackage = {
    teiId: string;
    content: Content;
    dddPerProduct: DDDPerProduct;
    dddPerPackage: DDDPerPackage;
};

type DDDPerProductConsumptionPackages = {
    teiId: string;
    year: number;
    healthSector: number;
    healthLevel: number;
    dddConsumptionPackages: number;
    dddUnit: Unit;
};

type ContentTonnesPerProduct = {
    teiId: string;
    year: number;
    healthSector: number;
    healthLevel: number;
    contentTonnes: number;
};

type AggregatedCalculations = {
    teiId: string;
    orgUnit: string;
    productId: string;
    atcCode: string;
    routeAdmin: string;
    salt: Salt;
    year: number;
    dataStatus: number;
    healthSector: number;
    healthLevel: number;
    tonnes: number;
    packages: number;
    ddds: number;
};

// DICTIONARIES AND MAPPINGS

const TEI_INSTANCES_HEADERS = {
    TEI_ID: "TEI id",
    ORG_UNIT: "Org Unit *",
    NO_GEOMETRY: "No geometry",
    ENROLLMENT_DATE: "Enrollment Date *\r\n(YYYY-MM-DD)",
    INCIDENT_DATE: "Incident Date\r\n(YYYY-MM-DD)",
    PRODUCT_ID: "Product id",
    PRODUCT_NAME: "Product name",
    LABEL: "Label",
    PACKAGE_SIZE: "Package size",
    STRENGTH: "Strength",
    STRENGTH_UNIT: "Strength unit",
    CONCENTRATION_VOLUME: "Concentration volume",
    CONCENTRATION_VOLUME_UNIT: "Concentration volume unit",
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
    VOLUME: "Volume",
    VOLUME_UNIT: "Volume unit",
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

const GRAM_FAMILY: Unit[] = ["gram", "milligram"];
const INTERNATIONAL_UNIT_FAMILY: Unit[] = ["international unit", "millions international unit"];
const UNIT_DOSE_FAMILY: Unit[] = ["unit dose"];
const LITER_FAMILY: Unit[] = ["liter", "milliliter"];

const VALID_STRENGTH_UNITS: Unit[] = [...GRAM_FAMILY, ...INTERNATIONAL_UNIT_FAMILY, ...UNIT_DOSE_FAMILY];

const UNITS_TO_STANDARDIZED_MEASUREMENT_UNIT: Record<Unit, Unit> = {
    milligram: "gram",
    gram: "gram",
    "international unit": "millions international unit",
    "millions international unit": "millions international unit",
    "unit dose": "unit dose",
    milliliter: "milliliter",
    liter: "milliliter",
};

const CONVERSION_TO_STANDARDIZED_MEASUREMENT_UNIT: Record<Unit, number> = {
    milligram: 0.001,
    gram: 1,
    "international unit": 0.000001,
    "millions international unit": 1,
    "unit dose": 1,
    milliliter: 1,
    liter: 1000,
};

const UNITS_MAPPING: Record<string, Unit> = {
    G: "gram",
    MG: "milligram",
    IU: "international unit",
    MU: "millions international unit",
    UD: "unit dose",
    L: "liter",
    ML: "milliliter",
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

// HELPER FUNCTIONS

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

function getCleanJsonData(jsonDataNotClean: any[][], sliceStart: number, sliceEnd: number): any[][] {
    const cleanJsonData = jsonDataNotClean.slice(sliceStart, sliceEnd);
    return cleanJsonData;
}

function writeToFile(dataToWrite: Record<string, any>, fileName: string): void {
    fs.writeFileSync(`src/scripts/${fileName}.json`, JSON.stringify(dataToWrite, null, 2), "utf-8");
}

function getProductProperties(product: any[]): Product {
    const positionTeiId = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.TEI_ID);
    const teiId: string = (product as any[])[positionTeiId].toString();

    const positionOrgUnit = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.ORG_UNIT);
    const orgUnit: string = product[positionOrgUnit];

    const positionProductId: number = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.PRODUCT_ID);
    const productId: string = product[positionProductId];

    const positionPackSize: number = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.PACKAGE_SIZE);
    const packSize: number = product[positionPackSize];

    const positionStrength = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.STRENGTH);
    const strength: number = product[positionStrength];

    const positionStrengthUnit = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.STRENGTH_UNIT);
    const strengthUnit: Unit = product[positionStrengthUnit];

    const positionConcVolume = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.CONCENTRATION_VOLUME);
    const concVolume: number = product[positionConcVolume];

    const positionConcVolumeUnit = Object.values(TEI_INSTANCES_HEADERS).indexOf(
        TEI_INSTANCES_HEADERS.CONCENTRATION_VOLUME_UNIT
    );
    const concVolumeUnit: Unit = product[positionConcVolumeUnit];

    const positionAtcCode = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.ATC_CODE);
    const atcCode: string = product[positionAtcCode];

    const positionCombinationCode = Object.values(TEI_INSTANCES_HEADERS).indexOf(
        TEI_INSTANCES_HEADERS.COMBINATION_CODE
    );
    const combinationCode: string = product[positionCombinationCode];

    const positionRouteAdmin = Object.values(TEI_INSTANCES_HEADERS).indexOf(
        TEI_INSTANCES_HEADERS.ROUTE_OF_ADMINISTRATION
    );
    const routeAdmin: RouteOfAdmin = product[positionRouteAdmin];

    const positionSalt = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.SALT);
    const salt: Salt = product[positionSalt];

    const positionVolume = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.VOLUME);
    const volume: number = product[positionVolume];

    const positionVolumeUnit = Object.values(TEI_INSTANCES_HEADERS).indexOf(TEI_INSTANCES_HEADERS.VOLUME_UNIT);
    const volumeUnit: Unit = product[positionVolumeUnit];

    return {
        teiId,
        orgUnit,
        productId,
        packSize,
        strength,
        strengthUnit,
        concVolume,
        concVolumeUnit,
        atcCode,
        combinationCode,
        routeAdmin,
        salt,
        volume,
        volumeUnit,
    };
}

function getProductConsumptionProperties(productConsumption: any[]): ProductConsumption {
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

    const positionDataStatus = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
        RAW_PRODUCT_CONSUMPTION_HEADERS.DATA_STATUS_MANUAL
    );
    const dataStatus: number = (productConsumption as any[])[positionDataStatus];

    const positionHealthSector = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
        RAW_PRODUCT_CONSUMPTION_HEADERS.HEALTH_SECTOR_MANUAL
    );
    const healthSector: number = (productConsumption as any[])[positionHealthSector];

    const positionHealthLevel = Object.values(RAW_PRODUCT_CONSUMPTION_HEADERS).indexOf(
        RAW_PRODUCT_CONSUMPTION_HEADERS.HEALTH_LEVEL_MANUAL
    );
    const healthLevel: number = (productConsumption as any[])[positionHealthLevel];
    return {
        teiId,
        date,
        packages,
        dataStatus,
        healthSector,
        healthLevel,
    };
}

// MAIN:

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

            const workbook = XLSX.readFile(excelFilePath, { cellDates: true });
            const tab1TEIInstancesSheetName = workbook.SheetNames[0];
            const tab2RawProductConsumptionSheetName = workbook.SheetNames[1];

            if (tab1TEIInstancesSheetName && tab2RawProductConsumptionSheetName) {
                // TEI Instances tab
                const jsonDataTEIInstancesNotClean = getJsonDataFromSheet(workbook, tab1TEIInstancesSheetName);
                const jsonDataTEIInstances = getCleanJsonData(jsonDataTEIInstancesNotClean, 5, 16);

                const teiInstancesData: Product[] = jsonDataTEIInstances.map((productArray): Product => {
                    return getProductProperties(productArray);
                });

                // AMC - Raw Product Consumption tab
                const jsonDataRawProductConsumptionNotClean = getJsonDataFromSheet(
                    workbook,
                    tab2RawProductConsumptionSheetName
                );
                const jsonDataRawProductConsumption = getCleanJsonData(jsonDataRawProductConsumptionNotClean, 2, 46);

                const rawProductConsumptionData: ProductConsumption[] = jsonDataRawProductConsumption.map(
                    (productConsumptionArray): ProductConsumption => {
                        return getProductConsumptionProperties(productConsumptionArray);
                    }
                );

                calculationConsumptionProductLevelData(teiInstancesData, rawProductConsumptionData);
            }
        },
    });

    run(cmd, process.argv.slice(2));
}

main();

function calculationConsumptionProductLevelData(
    teiInstancesData: Product[],
    rawProductConsumptionData: ProductConsumption[]
): void {
    const contentDDDPerProductAndDDDPerPackage: ContentDDDPerProductAndDDDPerPackage[] = teiInstancesData.map(
        (product: Product): ContentDDDPerProductAndDDDPerPackage => {
            // 1 - Calculate the content per product = content
            const content = calculateContentPerProduct(product);
            // 2 - Identify corresponding DDD per product = ddd
            const dddPerProduct = calculateDDDPerProduct(product);
            // 3 - Calculate DDD per package = ddd_per_pack
            const dddPerPackage = calculateDDDPerPackage(product, content, dddPerProduct);

            return {
                teiId: product.teiId,
                content,
                dddPerProduct,
                dddPerPackage,
            };
        }
    );

    writeToFile({ contentDDDPerProductAndDDDPerPackage }, "1&2&3 - contentDDDPerProductAndDDDPerPackage");

    // Given 1&2&3 calculates 4, 5, 6, 7, 8
    const dataByAtcRouteAdminYearHealthSectorAndHealthLevel =
        aggregateDataByAtcRouteAdminYearHealthSectorAndHealthLevel(
            teiInstancesData,
            rawProductConsumptionData,
            contentDDDPerProductAndDDDPerPackage
        );

    writeToFile(
        { dataByAtcRouteAdminYearHealthSectorAndHealthLevel },
        "LAST - aggregateDataByAtcRouteAdminYearHealthSectorAndHealthLevel"
    );
}

// 1 - Calculate the content per product
function calculateContentPerProduct(product: Product): Content {
    const {
        strength,
        strengthUnit,
        concVolume: maybeConcVolume,
        concVolumeUnit: maybeConcVolumeUnit,
        volume: maybeVolume,
        volumeUnit: maybeVolumeUnit,
        packSize,
    } = product;

    if (
        (isStrengthUnitValid(strengthUnit) && (!maybeConcVolumeUnit || !maybeVolumeUnit)) ||
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

        // 1d - content = standardized_strength × (standardized_volume ÷ standardized_conc_volume) × packsize
        const content = standardizedStrength * (standardizedVolume / standardizedConcVolume) * packSize;
        return {
            value: content,
            standarizedStrengthUnit,
        };
    } else {
        throw new Error(
            `Unit of ${product.teiId} not valid. strengthUnit: ${strengthUnit}, concVolumeUnit: ${maybeConcVolumeUnit}, concVolumeUnit: ${maybeVolumeUnit}`
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
function strengthUnitToStandardizedMeasurementUnit(strength: number, strengthUnit: Unit): number {
    return strength * CONVERSION_TO_STANDARDIZED_MEASUREMENT_UNIT[strengthUnit];
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
    return concVolumeOrVolume * CONVERSION_TO_STANDARDIZED_MEASUREMENT_UNIT[concVolumeUnitOrVolumeUnit];
}

// 2 - Identify corresponding DDD per product
function calculateDDDPerProduct(product: Product): DDDPerProduct {
    const { combinationCode } = product;

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
            dddUnit: UNITS_MAPPING[DDD_UNIT] as Unit,
        };
    } else {
        throw new Error(`Combination code ${combinationCode} not valid.`);
    }
}

// 2c
function getDDDOfProductFromDDDTable(product: Product): DDDPerProduct {
    const { atcCode, routeAdmin, salt } = product;

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
        const dddUnit = UNITS_MAPPING[DDD_UNIT] as Unit;
        const dddStandardizedUnit = UNITS_TO_STANDARDIZED_MEASUREMENT_UNIT[dddUnit] as Unit;
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
function calculateDDDPerPackage(product: Product, content: Content, dddPerProduct: DDDPerProduct): DDDPerPackage {
    const { atcCode } = product;

    const { standarizedStrengthUnit } = content;

    const conversionFactorAtc = CONVERSION_FACTOR.find(({ ATC5 }) => ATC5 === atcCode);

    // 3a
    const conversionFactor =
        standarizedStrengthUnit !== dddPerProduct.dddUnit && conversionFactorAtc?.FACTOR
            ? conversionFactorAtc.FACTOR
            : 1;

    // 3b - ddd_per_pack = content × conv_factor ÷ ddd_value
    return {
        value: (content.value * conversionFactor) / dddPerProduct.dddValue,
        dddUnit: dddPerProduct.dddUnit,
    };
}

// 4 - Calculate DDD per product consumption packages
function calculateDDDPerProductConsumptionPackages(
    productConsumption: ProductConsumption,
    dddPerPackage: DDDPerPackage
): DDDPerProductConsumptionPackages {
    const { teiId, date, packages, healthSector, healthLevel } = productConsumption;

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
}

// 5b - Calculate tonnes per product
function getTonnesPerProduct(
    product: Product,
    productConsumption: ProductConsumption,
    content: Content
): ContentTonnesPerProduct {
    const { teiId: teiIdProduct, atcCode } = product;
    const { date, packages, healthSector, healthLevel } = productConsumption;

    const { standarizedStrengthUnit: contentUnit } = content;
    // 5a
    const conversionFactorAtc = CONVERSION_FACTOR.find(({ ATC5 }) => ATC5 === atcCode);
    const conversionFactor = contentUnit !== "gram" && conversionFactorAtc?.FACTOR ? conversionFactorAtc.FACTOR : 1;

    // 5b - content_tonnes = (content × conv_factor × packages per year, health_sector and health_level) ÷ 1e6
    return {
        teiId: teiIdProduct,
        year: date.getFullYear(),
        healthSector,
        healthLevel,
        contentTonnes: (content.value * conversionFactor * packages) / 1e6,
    };
}

// Given 1&2&3 calculates 4, 5, 6, 7, 8
function aggregateDataByAtcRouteAdminYearHealthSectorAndHealthLevel(
    teiInstancesData: Product[],
    rawProductConsumptionData: ProductConsumption[],
    contentDDDPerProductAndDDDPerPackage: ContentDDDPerProductAndDDDPerPackage[]
): Record<string, AggregatedCalculations> {
    return rawProductConsumptionData.reduce(
        (acc: Record<string, AggregatedCalculations>, productConsumption: ProductConsumption) => {
            const product = teiInstancesData.find((product: Product) => productConsumption.teiId === product.teiId);

            const contentDDDPerProductAndDDDPerPackageOfProduct = contentDDDPerProductAndDDDPerPackage.find(
                productData => productData.teiId === productConsumption.teiId
            );

            if (product && contentDDDPerProductAndDDDPerPackageOfProduct) {
                // 4 - Calculate DDD per product consumption packages = ddd_cons_product
                const dddPerProductConsumptionPackages = calculateDDDPerProductConsumptionPackages(
                    productConsumption,
                    contentDDDPerProductAndDDDPerPackageOfProduct.dddPerPackage
                );

                // 5b - content_tonnes = (content × conv_factor × packages per year, health_sector and health_level) ÷ 1e6
                const contentTonnesOfProduct: ContentTonnesPerProduct = getTonnesPerProduct(
                    product,
                    productConsumption,
                    contentDDDPerProductAndDDDPerPackageOfProduct.content
                );

                const { teiId, orgUnit, productId, salt, atcCode, routeAdmin } = product;
                const { packages, date, dataStatus, healthSector, healthLevel } = productConsumption;
                const year: number = date.getFullYear();

                // 5c, 6a, 7a, 8a
                const id = `${teiId}-${atcCode}-${routeAdmin}-${year}-${healthSector}-${healthLevel}`;
                const aggregation: AggregatedCalculations =
                    acc[id] && acc[id]?.tonnes && acc[id]?.packages && acc[id]?.ddds
                        ? {
                              ...(acc[id] as AggregatedCalculations),
                              tonnes: (acc[id] as AggregatedCalculations).tonnes + contentTonnesOfProduct.contentTonnes,
                              packages: (acc[id] as AggregatedCalculations).packages + packages,
                              ddds:
                                  (acc[id] as AggregatedCalculations).ddds +
                                  dddPerProductConsumptionPackages.dddConsumptionPackages,
                          }
                        : {
                              teiId,
                              orgUnit,
                              productId,
                              atcCode,
                              routeAdmin,
                              salt,
                              year,
                              packages,
                              tonnes: contentTonnesOfProduct.contentTonnes,
                              ddds: dddPerProductConsumptionPackages.dddConsumptionPackages,
                              dataStatus,
                              healthSector,
                              healthLevel,
                          };

                return { ...acc, [id]: aggregation };
            } else {
                throw new Error(
                    `Product ${productConsumption.teiId} or ddd per product and ddd per package calculations not found`
                );
            }
        },
        {} as Record<string, AggregatedCalculations>
    );
}
