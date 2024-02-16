import { Id } from "./Ref";
import { RouteOfAdministrationKey } from "./data-entry/amc/RouteOfAdministration";
import { SaltKey } from "./data-entry/amc/Salt";
import { UnitKey } from "./data-entry/amc/Unit";

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

export type GlassATCVersion = {
    atc: ATCData[];
    ddd_combinations: DDDCombinationsData[];
    ddd: DDDData[];
    conversion: ConversionFactorData[];
    ddd_alterations?: DDDAlterationsData[];
    atc_alterations?: ATCAlterationsData[];
};

export type ListGlassATCVersions = Record<string, GlassATCVersion>;

export type DDDCombinationsData = {
    COMB_CODE: string;
    ARS: string;
    ATC5: string;
    FORM: string;
    ROUTE: RouteOfAdministrationKey;
    SUBSTANCES: string;
    DDD: number;
    DDD_UNIT: UnitKey;
    DDD_INFO: string;
    EXAMPLE: string;
};

export type ConversionFactorData = {
    ARS: string;
    ATC5: string;
    ROA: RouteOfAdministrationKey;
    UNIT_FROM: UnitKey;
    UNIT_TO: UnitKey;
    FACTOR: number;
};

export type DDDData = {
    ARS: string;
    ATC5: string;
    ROA: RouteOfAdministrationKey;
    SALT: SaltKey;
    DDD: number;
    DDD_UNIT: UnitKey;
    DDD_STD: number;
    NOTES?: string;
};

export type DDDAlterationsData = {
    SUBSTANCE: string;
    PREV_DDD: number;
    PREV_DDD_UNIT: UnitKey;
    PREV_ROUTE: RouteOfAdministrationKey;
    NEW_DDD: number;
    NEW_DDD_UNIT: UnitKey;
    NEW_ROUTE: RouteOfAdministrationKey;
    CURRENT_ATC: string;
    YEAR_CHANGED: string;
    DELETED?: boolean;
};

export type ATCAlterationsData = {
    PREV_ATC: string;
    SUBSTANCE: string;
    NEW_ATC: string;
    YEAR_CHANGED: string;
};

export type ATCData = {
    CODE: string;
    NAME: string;
    LEVEL: string;
    PATH: string;
};

export function validateAtcVersion(atcVersionKey: string): boolean {
    const pattern = /^ATC-\d{4}-v\d+$/;
    return pattern.test(atcVersionKey);
}

export function createAtcVersionKey(year: number, version: number): string {
    return `ATC-${year.toString()}-v${version.toString()}`;
}
