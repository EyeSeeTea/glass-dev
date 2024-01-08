import { DDDAlterationsData, DDDData, GlassATCVersion, ListGlassATCVersions } from "../../../../entities/GlassATC";
import { Id } from "../../../../entities/Ref";
import { RawSubstanceConsumptionData } from "../../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { ROUTE_OF_ADMINISTRATION_MAPPING } from "../../../../entities/data-entry/amc/RouteOfAdministration";
import { SALT_MAPPING } from "../../../../entities/data-entry/amc/Salt";
import { SubstanceConsumptionCalculated } from "../../../../entities/data-entry/amc/SubstanceConsumptionCalculated";
import {
    CONVERSION_TO_STANDARDIZED_MEASUREMENT_UNIT,
    UNITS_MAPPING,
    Unit,
} from "../../../../entities/data-entry/amc/Unit";

const DDD_NAME = "ddd";
const DDD_ALTERATIONS_NAME = "ddd_alterations";

export function calculateConsumptionSubstanceLevelData(
    period: string,
    orgUnitId: Id,
    rawSubstanceConsumptionData: RawSubstanceConsumptionData[],
    atcVersionsByKeys: ListGlassATCVersions,
    currentAtcVersionKey: string
): SubstanceConsumptionCalculated[] {
    return rawSubstanceConsumptionData
        .map(rawSubstanceConsumption => {
            // 1a & 2
            const dddStandarizedLatest = getStandardizedDDD(
                rawSubstanceConsumption,
                atcVersionsByKeys[currentAtcVersionKey]
            );
            if (dddStandarizedLatest) {
                // 1b & 2
                const { atc_version_manual } = rawSubstanceConsumption;
                const dddStandarizedInRawSubstanceConsumption = getStandardizedDDD(
                    rawSubstanceConsumption,
                    atcVersionsByKeys[atc_version_manual]
                );
                if (dddStandarizedInRawSubstanceConsumption) {
                    // 3 & 4
                    const dddsAdjust = getDDDsAdjust(
                        rawSubstanceConsumption,
                        dddStandarizedLatest,
                        dddStandarizedInRawSubstanceConsumption
                    );
                    return {
                        period,
                        orgUnitId,
                        atc_autocalculated: rawSubstanceConsumption.atc_manual,
                        route_admin_autocalculated: rawSubstanceConsumption.route_admin_manual,
                        salt_autocalculated: rawSubstanceConsumption.salt_manual,
                        packages_autocalculated: rawSubstanceConsumption.packages_manual,
                        ddds_autocalculated: dddsAdjust,
                        atc_version_autocalculated: currentAtcVersionKey,
                        tons_autocalculated: rawSubstanceConsumption.tons_manual,
                        data_status_autocalculated: rawSubstanceConsumption.data_status_manual,
                        health_sector_autocalculated: rawSubstanceConsumption.health_sector_manual,
                        health_level_autocalculated: rawSubstanceConsumption.health_level_manual,
                    };
                }
            }
        })
        .filter(Boolean) as SubstanceConsumptionCalculated[];
}

function getStandardizedDDD(
    rawSubstanceConsumptionData: RawSubstanceConsumptionData,
    atcVersion: GlassATCVersion | undefined
): number | undefined {
    const { atc_manual, salt_manual, route_admin_manual } = rawSubstanceConsumptionData;
    const dddData: DDDData[] = atcVersion?.find(({ name }) => name === DDD_NAME)?.data as DDDData[];

    const dddDataFound = dddData.find(({ ATC5, SALT, ROA }) => {
        const isDefaultSalt = !SALT && SALT_MAPPING[salt_manual] === SALT_MAPPING.default;
        return (
            ATC5 === atc_manual &&
            ROUTE_OF_ADMINISTRATION_MAPPING[ROA] === ROUTE_OF_ADMINISTRATION_MAPPING[route_admin_manual] &&
            ((SALT && SALT_MAPPING[SALT] === SALT_MAPPING[salt_manual]) || isDefaultSalt)
        );
    });

    if (dddDataFound) {
        return dddDataFound.DDD_STD;
    }

    const dddAlterations: DDDAlterationsData[] = atcVersion?.find(({ name }) => name === DDD_ALTERATIONS_NAME)
        ?.data as DDDAlterationsData[];
    const newDddData = dddAlterations?.find(
        ({ CURRENT_ATC, NEW_ROUTE, DELETED }) =>
            !DELETED &&
            CURRENT_ATC === atc_manual &&
            NEW_ROUTE &&
            ROUTE_OF_ADMINISTRATION_MAPPING[NEW_ROUTE] === ROUTE_OF_ADMINISTRATION_MAPPING[route_admin_manual]
    );

    if (newDddData) {
        const dddUnit = UNITS_MAPPING[newDddData.NEW_DDD_UNIT] as Unit;
        const dddStandardizedValue = newDddData.NEW_DDD * CONVERSION_TO_STANDARDIZED_MEASUREMENT_UNIT[dddUnit];
        return dddStandardizedValue;
    }
}

function getDDDsAdjust(
    rawSubstanceConsumptionData: RawSubstanceConsumptionData,
    dddStandarizedLatest: number,
    dddStandarizedInRawSubstanceConsumption: number
): number {
    const { ddds_manual } = rawSubstanceConsumptionData;
    // 3 - ratio_ddd = standardized_ddd_value_uploaded ÷ standardized_ddd_value_latest
    const ratioDDD = dddStandarizedInRawSubstanceConsumption / dddStandarizedLatest;
    // 4 - ddds_adjust = ddds × ratio_ddd
    return ddds_manual * ratioDDD;
}
