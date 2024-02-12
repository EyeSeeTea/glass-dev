import { Id } from "../../Ref";
import { RouteOfAdministrationKey } from "./RouteOfAdministration";
import { SaltKey } from "./Salt";

export type SubstanceConsumptionCalculated = {
    atc_autocalculated: string;
    route_admin_autocalculated: RouteOfAdministrationKey;
    salt_autocalculated: SaltKey;
    packages_autocalculated: number;
    ddds_autocalculated: number;
    atc_version_autocalculated: string;
    tons_autocalculated: number;
    data_status_autocalculated: number;
    health_sector_autocalculated: number;
    health_level_autocalculated: number;
    period: string;
    orgUnitId: Id;
    report_date: string;
    eventId?: Id;
};

export const SUBSTANCE_CONSUMPTION_CALCULATED_KEYS = [
    "atc_autocalculated",
    "route_admin_autocalculated",
    "salt_autocalculated",
    "packages_autocalculated",
    "ddds_autocalculated",
    "atc_version_autocalculated",
    "tons_autocalculated",
    "data_status_autocalculated",
    "health_sector_autocalculated",
    "health_level_autocalculated",
];

export type SubstanceConsumptionCalculatedKeys = keyof SubstanceConsumptionCalculated;
