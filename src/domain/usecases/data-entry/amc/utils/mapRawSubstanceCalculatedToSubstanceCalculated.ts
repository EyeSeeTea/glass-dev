import moment from "moment";
import { RawSubstanceConsumptionCalculated } from "../../../../entities/data-entry/amc/RawSubstanceConsumptionCalculated";
import { SubstanceConsumptionCalculated } from "../../../../entities/data-entry/amc/SubstanceConsumptionCalculated";

export function mapRawSubstanceCalculatedToSubstanceCalculated(
    rawSubstanceConsumptionCalculatedData: RawSubstanceConsumptionCalculated[],
    period: string
): SubstanceConsumptionCalculated[] {
    return rawSubstanceConsumptionCalculatedData.map(rawSubstanceConsumptionCalculated => {
        const reportDate = moment(new Date(`${period}-01-01`))
            .toISOString()
            .split("T")
            .at(0);

        return {
            atc_autocalculated: rawSubstanceConsumptionCalculated.atc_autocalculated,
            route_admin_autocalculated: rawSubstanceConsumptionCalculated.route_admin_autocalculated,
            salt_autocalculated: rawSubstanceConsumptionCalculated.salt_autocalculated,
            packages_autocalculated: rawSubstanceConsumptionCalculated.packages_autocalculated,
            ddds_autocalculated: rawSubstanceConsumptionCalculated.ddds_autocalculated,
            atc_version_autocalculated: rawSubstanceConsumptionCalculated.atc_version_autocalculated,
            kilograms_autocalculated: rawSubstanceConsumptionCalculated.kilograms_autocalculated,
            data_status_autocalculated: rawSubstanceConsumptionCalculated.data_status_autocalculated,
            health_sector_autocalculated: rawSubstanceConsumptionCalculated.health_sector_autocalculated,
            health_level_autocalculated: rawSubstanceConsumptionCalculated.health_level_autocalculated,
            am_class: rawSubstanceConsumptionCalculated.am_class,
            atc2: rawSubstanceConsumptionCalculated.atc2,
            atc3: rawSubstanceConsumptionCalculated.atc3,
            atc4: rawSubstanceConsumptionCalculated.atc4,
            aware: rawSubstanceConsumptionCalculated.aware,
            period: period,
            orgUnitId: rawSubstanceConsumptionCalculated.orgUnitId,
            report_date: reportDate || moment(new Date(`${period}-01-01`)).toISOString(),
        };
    });
}
