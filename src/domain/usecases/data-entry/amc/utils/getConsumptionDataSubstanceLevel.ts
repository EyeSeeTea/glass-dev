import { Id } from "@eyeseetea/d2-api";
import { Future, FutureData } from "../../../../entities/Future";
import { GlassAtcVersionData } from "../../../../entities/GlassAtcVersionData";
import { RawSubstanceConsumptionData } from "../../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { SubstanceConsumptionCalculated } from "../../../../entities/data-entry/amc/SubstanceConsumptionCalculated";
import { calculateConsumptionSubstanceLevelData } from "./calculationConsumptionSubstanceLevelData";
import { logger } from "../../../../../utils/logger";
import { Maybe } from "../../../../../types/utils";

// === CHANGE-TABLE APPROACH ===
// atcRepository and getListOfAtcVersionsByKeys removed — historical ATC versions are no longer
// loaded from DataStore.  calculateConsumptionSubstanceLevelData now derives historical DDD
// values directly from the change table embedded in the current ATC version object.
//
// OLD signature (kept for reference):
// export function getConsumptionDataSubstanceLevel(params: {
//     orgUnitId: Id;
//     period: string;
//     rawSubstanceConsumptionData: Maybe<RawSubstanceConsumptionData[]>;
//     atcCurrentVersionData: GlassAtcVersionData;
//     currentAtcVersionKey: string;
//     atcRepository: GlassATCRepository;   // ← removed
// }): FutureData<SubstanceConsumptionCalculated[]>
//
// OLD body (kept for reference):
//     const atcVersionKeys = Array.from(new Set(rawSubstanceConsumptionData.map(...)));
//     return atcRepository.getListOfAtcVersionsByKeys(atcVersionKeys).flatMap(atcVersionsByKeys => {
//         // If any key was missing from DataStore, Future.joinObj inside getListOfAtcVersionsByKeys
//         // returned Future.error → the entire calculation aborted.
//         const allATCClassificationsByVersion = { ...atcVersionsByKeys, [currentAtcVersionKey]: atcCurrentVersionData };
//         const result = calculateConsumptionSubstanceLevelData(period, orgUnitId,
//             rawSubstanceConsumptionData, allATCClassificationsByVersion, currentAtcVersionKey);
//         return Future.success(result);
//     });

export function getConsumptionDataSubstanceLevel(params: {
    orgUnitId: Id;
    period: string;
    rawSubstanceConsumptionData: Maybe<RawSubstanceConsumptionData[]>;
    atcCurrentVersionData: GlassAtcVersionData;
    currentAtcVersionKey: string;
}): FutureData<SubstanceConsumptionCalculated[]> {
    const { orgUnitId, period, rawSubstanceConsumptionData, atcCurrentVersionData, currentAtcVersionKey } = params;

    if (!rawSubstanceConsumptionData) {
        logger.error(
            `[${new Date().toISOString()}] Cannot find Raw Substance Consumption Data for orgUnitsId ${orgUnitId} and period ${period} for calculations`
        );
        return Future.error("Cannot find Raw Substance Consumption Data");
    }

    const calculatedConsumptionSubstanceLevelData = calculateConsumptionSubstanceLevelData(
        period,
        orgUnitId,
        rawSubstanceConsumptionData,
        atcCurrentVersionData,
        currentAtcVersionKey
    );
    return Future.success(calculatedConsumptionSubstanceLevelData);
}
