import { RouteOfAdministrationKey } from "./RouteOfAdministration";
import { SaltKey } from "./Salt";

export type RawSubstanceConsumptionData = {
    atc_manual: string;
    route_admin_manual: RouteOfAdministrationKey;
    salt_manual: SaltKey;
    packages_manual: number;
    ddds_manual: number;
    atc_version_manual: string;
    tons_manual: number;
    data_status_manual: number;
    health_sector_manual: number;
    health_level_manual: number;
    report_date: string;
};

export const RAW_SUBSTANCE_CONSUMPTION_DATA_KEYS = [
    "atc_manual",
    "route_admin_manual",
    "salt_manual",
    "packages_manual",
    "ddds_manual",
    "atc_version_manual",
    "tons_manual",
    "data_status_manual",
    "health_sector_manual",
    "health_level_manual",
];
