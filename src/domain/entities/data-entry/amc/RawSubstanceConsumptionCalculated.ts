import { Id } from "../../Ref";
import { Salt } from "./Salt";
import { Unit } from "./Unit";

export type Content = {
    value: number;
    standarizedStrengthUnit: Unit;
};

export type DDDPerProduct = {
    dddValue: number;
    dddUnit: Unit;
};

export type DDDPerPackage = {
    value: number;
    dddUnit: Unit;
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
    health_sector_manual: number;
    health_level_manual: number;
    dddConsumptionPackages: number;
    dddUnit: Unit;
};

export type ContentTonnesPerProduct = {
    AMR_GLASS_AMC_TEA_PRODUCT_ID: string;
    year: string;
    health_sector_manual: number;
    health_level_manual: number;
    contentTonnes: number;
};

export type RawSubstanceConsumptionCalculated = {
    AMR_GLASS_AMC_TEA_PRODUCT_ID: string;
    atc_autocalculated: string;
    route_admin_autocalculated: string;
    salt_autocalculated: Salt;
    year: string;
    data_status_autocalculated: number;
    health_sector_autocalculated: number;
    health_level_autocalculated: number;
    tons_autocalculated: number;
    packages_autocalculated: number;
    atc_version_autocalculated: string;
    ddds_autocalculated: number;
    orgUnitId: Id;
};

export type RawSubstanceConsumptionCalculatedKeys = keyof RawSubstanceConsumptionCalculated;
