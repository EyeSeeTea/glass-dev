import moment from "moment";
import { RawSubstanceConsumptionCalculated } from "../../../../entities/data-entry/amc/RawSubstanceConsumptionCalculated";
import { SubstanceConsumptionCalculated } from "../../../../entities/data-entry/amc/SubstanceConsumptionCalculated";

export function mapRawSubstanceCalculatedToSubstanceCalculated(
    rawSubstanceConsumptionCalculatedData: RawSubstanceConsumptionCalculated[],
    period: string
): SubstanceConsumptionCalculated[] {
    const reportDate =
        moment(new Date(`${period}-01-01`))
            .toISOString()
            .split("T")
            .at(0) ?? moment(new Date(`${period}-01-01`)).toISOString();

    // Aggregate across all products that share the same substance identity and context dimensions.
    // PRODUCT_ID is intentionally excluded — this is the substance-level output.
    const aggregated: Record<string, SubstanceConsumptionCalculated> = {};

    for (const raw of rawSubstanceConsumptionCalculatedData) {
        const key = [
            raw.atc_autocalculated,
            raw.combination_code_autocalculated,
            raw.route_admin_autocalculated,
            raw.salt_autocalculated,
            raw.health_sector_autocalculated,
            raw.health_level_autocalculated,
            raw.data_status_autocalculated,
        ].join("|");

        const existing = aggregated[key];
        if (existing) {
            aggregated[key] = {
                ...existing,
                packages_autocalculated:
                    raw.packages_autocalculated != null
                        ? (existing.packages_autocalculated ?? 0) + raw.packages_autocalculated
                        : existing.packages_autocalculated,
                ddds_autocalculated:
                    raw.ddds_autocalculated != null
                        ? (existing.ddds_autocalculated ?? 0) + raw.ddds_autocalculated
                        : existing.ddds_autocalculated,
                kilograms_autocalculated:
                    raw.kilograms_autocalculated != null
                        ? (existing.kilograms_autocalculated ?? 0) + raw.kilograms_autocalculated
                        : existing.kilograms_autocalculated,
            };
        } else {
            aggregated[key] = {
                atc_autocalculated: raw.atc_autocalculated,
                combination_code_autocalculated: raw.combination_code_autocalculated,
                route_admin_autocalculated: raw.route_admin_autocalculated,
                salt_autocalculated: raw.salt_autocalculated,
                packages_autocalculated: raw.packages_autocalculated,
                ddds_autocalculated: raw.ddds_autocalculated,
                atc_version_autocalculated: raw.atc_version_autocalculated,
                kilograms_autocalculated: raw.kilograms_autocalculated,
                data_status_autocalculated: raw.data_status_autocalculated,
                health_sector_autocalculated: raw.health_sector_autocalculated,
                health_level_autocalculated: raw.health_level_autocalculated,
                am_class: raw.am_class,
                atc2: raw.atc2,
                atc3: raw.atc3,
                atc4: raw.atc4,
                aware: raw.aware,
                period: period,
                orgUnitId: raw.orgUnitId,
                report_date: reportDate,
            };
        }
    }

    return Object.values(aggregated);
}
