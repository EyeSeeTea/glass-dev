import { Maybe } from "../../../../types/utils";
import { AmName, AwrName, RouteOfAdministrationCode, SaltCode } from "../../GlassAtcVersionData";
import { Id } from "../../Ref";

export type SubstanceConsumptionCalculated = {
    atc_autocalculated: string;
    route_admin_autocalculated: RouteOfAdministrationCode;
    salt_autocalculated: SaltCode;
    packages_autocalculated: number;
    ddds_autocalculated: number;
    atc_version_autocalculated: string;
    tons_autocalculated: number;
    data_status_autocalculated: number;
    health_sector_autocalculated: string;
    health_level_autocalculated: string;
    am_class: Maybe<AmName>;
    atc2: Maybe<string>;
    atc3: Maybe<string>;
    atc4: Maybe<string>;
    aware: Maybe<AwrName>;
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
    "am_class",
    "atc2",
    "atc3",
    "atc4",
    "aware",
];

export type SubstanceConsumptionCalculatedKeys = keyof SubstanceConsumptionCalculated;
