import { Id } from "./Ref";

export type GlassATCHistory = {
    currentVersion: boolean;
    year: number;
    version: number;
    uploadedDate: Date;
};

export type GlassATCRecalculateDataInfo = {
    date: string;
    recalculate: boolean;
    periods: string[];
    orgUnitsIds: Id[];
};

export const LAST_ATC_CODE_LEVEL = 5;
export const DEFAULT_SALT_CODE = "XXXX";
export const CODE_PRODUCT_NOT_HAVE_ATC = "Z99ZZ99";
export const COMB_CODE_PRODUCT_NOT_HAVE_ATC = "Z99ZZ99_99";

export type ATCVersionKey = string;

export type ATCCodeLevel5 = string;

export type RouteOfAdministrationCode = string;
export type RouteOfAdministrationName = string;

export type UnitCode = string;
export type UnitName = string;

export type SaltCode = string;
export type SaltName = string;

export type ATCData = {
    CODE: string;
    NAME: string;
    LEVEL: number;
    PATH: string;
};

export type DDDData = {
    ARS: string;
    ATC5: ATCCodeLevel5;
    ROA: RouteOfAdministrationCode;
    SALT: SaltCode;
    DDD: number;
    DDD_UNIT: UnitCode;
    DDD_STD: number;
    NOTES: string | null;
};

export type CombinationsData = {
    COMB_CODE: string;
    ARS: string;
    ATC5: ATCCodeLevel5;
    FORM: string;
    ROA: RouteOfAdministrationCode;
    UNIT_DOSE: string;
    DDD: number;
    DDD_UNIT: UnitCode;
    DDD_INFO: string;
    EXAMPLES: string;
    DDD_GRAMS: number;
    MULTIFORM: boolean;
    UD_GRAMS: number | null;
};

export type ConversionsIUToGramsData = {
    ARS: string;
    ATC5: ATCCodeLevel5;
    ROA: RouteOfAdministrationCode;
    UNIT_FROM: UnitCode;
    UNIT_TO: "G";
    FACTOR: number;
    SALT: SaltCode;
};

export type ConversionsDDDToGramsData = {
    ATC5: ATCCodeLevel5;
    DDD_GRAM_UNIT: "G" | null;
    DDD_GRAM_VALUE: number | null;
    INFO: string | null;
    ROA: RouteOfAdministrationCode;
};

type ATCAndDDDChangesData = ATCChangesData | DDDChangesData;

export type DDDChangesData = {
    CATEGORY: "DDD";
    ATC_CODE: ATCCodeLevel5;
    CHANGE: string;
    NEW_DDD_INFO: string | null;
    NEW_DDD_ROA: RouteOfAdministrationCode;
    NEW_DDD_UNIT: UnitCode;
    NEW_DDD_VALUE: number;
    PREVIOUS_DDD_INFO: string | null;
    PREVIOUS_DDD_ROA: RouteOfAdministrationCode;
    PREVIOUS_DDD_UNIT: UnitCode;
    PREVIOUS_DDD_VALUE: number;
    YEAR: number;
};

export type ATCChangesData = {
    CATEGORY: "ATC";
    CHANGE: string; // TODO: Add what are the possible values
    INFO: string | null;
    NEW_ATC: ATCCodeLevel5;
    NEW_NAME: string | null;
    PREVIOUS_ATC: ATCCodeLevel5;
    SUBSTANCE_NAME: string | null;
    YEAR: number;
};

export type SaltsData = {
    CODE: SaltCode;
    INFO: string;
    NAME: SaltName;
};

export type RoasData = {
    CODE: RouteOfAdministrationCode;
    NAME: RouteOfAdministrationName;
};

export type UnitsData = {
    BASE_CONV: number;
    UNIT: UnitCode;
    NAME: UnitName;
    UNIT_FAMILY?: UnitCode;
    USE_STRENGTH: boolean;
    USE_VOLUME: boolean;
};

type AmCode = string;
export type AmName = string;

type AwrCode = string;
export type AwrName = string;

export type AmClassification = {
    CODE: AmCode;
    NAME: AmName;
};

export type AmMapping = {
    ATCS: string[];
    CODE: AmCode;
};

export type AwareClassification = {
    CODE: AwrCode;
    NAME: AwrName;
};

export type AwareMapping = {
    ATC5: ATCCodeLevel5;
    AWR: AwrCode;
    EML: string;
    ROA: string | null;
};

export type AtcDddIndexData = {
    atcs: ATCData[];
    ddds: DDDData[];
    combinations: CombinationsData[];
    conversions_iu_g: ConversionsIUToGramsData[];
    conversions_ddd_g: ConversionsDDDToGramsData[];
    changes: ATCAndDDDChangesData[];
    salts: SaltsData[];
    roas: RoasData[];
    units: UnitsData[];
};

export type AwareClassificationData = {
    classification: AwareClassification[];
    atc_awr_mapping: AwareMapping[];
};

export type AmClassificationData = {
    classification: AmClassification[];
    atc_am_mapping: AmMapping[];
};

export type GlassAtcVersionData = AtcDddIndexData & {
    am_classification: AmClassificationData;
    aware_classification: AwareClassificationData;
};

export type ListGlassATCVersions = Record<ATCVersionKey, GlassAtcVersionData>;

export type ListGlassATCLastVersionKeysByYear = Record<string, ATCVersionKey>;

export function validateAtcVersion(atcVersionKey: ATCVersionKey): boolean {
    const pattern = /^ATC-\d{4}-v\d+$/;
    return pattern.test(atcVersionKey);
}

export function createAtcVersionKey(year: number, version: number): ATCVersionKey {
    return `ATC-${year.toString()}-v${version.toString()}`;
}

export function getYearFromAtcVersionKey(key: ATCVersionKey): number | undefined {
    const year = key.split("-")[1];
    if (year) return parseInt(year);
}

export function getDDDChanges(changesData: ATCAndDDDChangesData[]): DDDChangesData[] {
    return changesData.filter(({ CATEGORY }) => CATEGORY === "DDD") as DDDChangesData[];
}

export function getATCChanges(changesData: ATCAndDDDChangesData[]): ATCChangesData[] {
    return changesData.filter(({ CATEGORY }) => CATEGORY === "ATC") as ATCChangesData[];
}

export function getValidStrengthUnits(unitsData: UnitsData[]): UnitsData[] {
    return unitsData.filter(({ USE_STRENGTH }) => USE_STRENGTH);
}

export function getValidVolumeOrConcentrationUnits(unitsData: UnitsData[]): UnitsData[] {
    return unitsData.filter(({ USE_VOLUME }) => USE_VOLUME);
}

export function isStrengthUnitValid(strengthUnit: UnitCode, unitsData: UnitsData[]): boolean {
    const validStrengthUnitsCodes = getValidStrengthUnits(unitsData).map(({ UNIT }) => UNIT);
    return validStrengthUnitsCodes.includes(strengthUnit);
}

export function getStandardizedUnitsAndValue(
    unitsData: UnitsData[],
    unit: UnitCode,
    value: number
):
    | {
          standarizedValue: number;
          standarizedUnit: UnitCode | undefined;
      }
    | undefined {
    const unitData = unitsData.find(({ UNIT }) => unit === UNIT);
    if (unitData) {
        const standarizedValue = value * unitData.BASE_CONV;
        const standarizedUnit = unitData.BASE_CONV === 1 ? unitData.UNIT : unitData.UNIT_FAMILY;
        return {
            standarizedValue: standarizedValue,
            standarizedUnit: standarizedUnit,
        };
    }
}

export function getStandardizedUnit(unitsData: UnitsData[], unit: UnitCode): UnitCode | undefined {
    const unitData = unitsData.find(({ UNIT }) => unit === UNIT);
    if (unitData) {
        return unitData.BASE_CONV === 1 ? unitData.UNIT : unitData.UNIT_FAMILY;
    }
}

export function getNewAtcCode(
    oldAtcCode: ATCCodeLevel5,
    atcChanges: ATCChangesData[] | undefined
): ATCCodeLevel5 | undefined {
    return atcChanges?.find(({ PREVIOUS_ATC, CHANGE }) => {
        return CHANGE !== "DELETED" && PREVIOUS_ATC === oldAtcCode;
    })?.NEW_ATC;
}

/**
 * Get the corresponding ATC code in the current ATC version of an ATC code defined in an old ATC version.
 *
 * @param {ATCCodeLevel5} oldAtcCode - The old ATC code
 * @param {ATCChangesData[]} AtcChanges - The list of ATC changes
 * @param {ATCData[]} currentAtcs - The list of current ATC codes
 *
 * @return {ATCCodeLevel5 | undefined} - the current ATC code or undefined if no correspondance.
 */
export function getNewAtcCodeRec( // Todo: replace getNewAtcCode by this function
    oldAtcCode: ATCCodeLevel5,
    atcChanges: ATCChangesData[],
    currentAtcs: ATCData[]
): ATCCodeLevel5 | undefined {
    function findAtcCodeCurrent(atcCode: ATCCodeLevel5): string | undefined {
        const newAtc = atcChanges.find(({ PREVIOUS_ATC, CHANGE }) => {
            return CHANGE !== "SUPERSEDED" && PREVIOUS_ATC === atcCode;
        })?.NEW_ATC;
        if (newAtc === undefined) {
            return undefined;
        }
        const foundAtcInCurrent = currentAtcs.find(({ CODE }: ATCData) => {
            return CODE === atcCode;
        })?.CODE;
        if (foundAtcInCurrent === undefined) {
            return findAtcCodeCurrent(newAtc);
        } else {
            return foundAtcInCurrent;
        }
    }
    return findAtcCodeCurrent(oldAtcCode);
}

/**
 * Get the DDD for an ATC code, ROA code and SALT code based on an specific ATC version.
 *
 * @param {ATCCodeLevel5} oldCode - The ATC code
 * @param {RouteOfAdministrationCode} roaCode - The ROA code
 * @param {SaltCode} saltCode - The Salt code
 * @param {GlassAtcVersionData} atcVersion - The ATC version
 *
 * @return {DDDData | undefined} - the corresponding DDD.
 */
export function getDDDForAtcVersion(
    atcCode: ATCCodeLevel5,
    roaCode: RouteOfAdministrationCode,
    saltCode: SaltCode,
    atcVersion: GlassAtcVersionData
) {
    const ddds = atcVersion.ddds.filter(({ ATC5, ROA, SALT }: DDDData) => {
        return ATC5 === atcCode && ROA === roaCode && SALT === saltCode;
    });
    if (ddds.length === 0) return undefined;
    return ddds[0];
}

export function getNewDddData(
    atcCode: ATCCodeLevel5,
    roa: RouteOfAdministrationCode,
    dddChanges: DDDChangesData[] | undefined
): DDDChangesData | undefined {
    return dddChanges?.find(({ ATC_CODE, CHANGE, PREVIOUS_DDD_ROA }) => {
        return CHANGE !== "DELETED" && ATC_CODE === atcCode && PREVIOUS_DDD_ROA === roa;
    });
}

export function getAmClass(amClassData: AmClassificationData, atcCode: ATCCodeLevel5): AmName | undefined {
    const atcAwareCodeFullyFound = amClassData.atc_am_mapping.find(({ ATCS }) =>
        ATCS.some(atc => atcCode === atc)
    )?.CODE;

    if (atcAwareCodeFullyFound) {
        return amClassData.classification.find(({ CODE }) => CODE === atcAwareCodeFullyFound)?.NAME;
    }

    const atcAwareCodeFoundByPrefix = amClassData.atc_am_mapping.find(({ ATCS }) =>
        ATCS.some(atc => {
            if (atc.endsWith("*")) {
                const prefix = atc.slice(0, -1);
                return atcCode.startsWith(prefix);
            }
        })
    )?.CODE;

    if (atcAwareCodeFoundByPrefix) {
        return amClassData.classification.find(({ CODE }) => CODE === atcAwareCodeFoundByPrefix)?.NAME;
    }
}

export function getAwareClass(awareClassData: AwareClassificationData, atcCode: ATCCodeLevel5): AwrName | undefined {
    const atcAwareCode = awareClassData.atc_awr_mapping.find(({ ATC5 }) => ATC5 === atcCode)?.AWR;
    return awareClassData.classification.find(({ CODE }) => CODE === atcAwareCode)?.NAME;
}

const splitPathBy = "/";

export function getAtcCodeByLevel(
    atcData: ATCData[],
    atcCode: ATCCodeLevel5
): Record<string, string | undefined> | undefined {
    const atc = atcData.find(({ CODE }) => CODE === atcCode);
    const atcCodeLevelHeirarchy = atc?.PATH?.split(splitPathBy);
    if (atcCodeLevelHeirarchy) {
        return {
            level1: atcCodeLevelHeirarchy[1],
            level2: atcCodeLevelHeirarchy[2],
            level3: atcCodeLevelHeirarchy[3],
            level4: atcCodeLevelHeirarchy[4],
            level5: atcCodeLevelHeirarchy[5],
        };
    }
}
