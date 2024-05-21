import { AmName, AwrName, SaltCode, UnitCode } from "../../GlassAtcVersionData";
import { Id } from "../../Ref";

export type Content = {
    value: number;
    standarizedStrengthUnit: UnitCode;
};

export type DDDPerProduct = {
    dddValue: number;
    dddUnit: UnitCode;
};

export type DDDPerPackage = {
    value: number;
    dddUnit: UnitCode;
};

export type ContentDDDPerProductAndDDDPerPackage = {
    AMR_GLASS_AMC_TEA_PRODUCT_ID: string;
    content: Content;
    dddPerProduct: DDDPerProduct | undefined;
    dddPerPackage: DDDPerPackage | undefined;
};

export type DDDPerProductConsumptionPackages = {
    AMR_GLASS_AMC_TEA_PRODUCT_ID: string;
    year: string;
    health_sector_manual: string;
    health_level_manual: string;
    dddConsumptionPackages: number;
    dddUnit: UnitCode;
};

export type ContentTonnesPerProduct = {
    AMR_GLASS_AMC_TEA_PRODUCT_ID: string;
    year: string;
    health_sector_manual: string;
    health_level_manual: string;
    contentTonnes: number;
};

export type RawSubstanceConsumptionCalculated = {
    AMR_GLASS_AMC_TEA_PRODUCT_ID: string;
    atc_autocalculated: string;
    route_admin_autocalculated: string;
    salt_autocalculated: SaltCode;
    year: string;
    data_status_autocalculated: number;
    health_sector_autocalculated: string;
    health_level_autocalculated: string;
    tons_autocalculated: number;
    packages_autocalculated: number;
    atc_version_autocalculated: string;
    ddds_autocalculated: number;
    am_class: AmName;
    atc2: string;
    atc3: string;
    atc4: string;
    aware: AwrName;
    orgUnitId: Id;
    eventId?: Id;
};

export type RawSubstanceConsumptionCalculatedKeys = keyof RawSubstanceConsumptionCalculated;

export const RAW_SUBSTANCE_CONSUMPTION_CALCULATED_KEYS = [
    "atc_autocalculated",
    "route_admin_autocalculated",
    "salt_autocalculated",
    "packages_autocalculated",
    "tons_autocalculated",
    "atc_version_autocalculated",
    "data_status_autocalculated",
    "health_sector_autocalculated",
    "health_level_autocalculated",
    "ddds_autocalculated",
    "am_class",
    "atc2",
    "atc3",
    "atc4",
    "aware",
];
