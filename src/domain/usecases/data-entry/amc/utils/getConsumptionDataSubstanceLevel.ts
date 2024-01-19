import { Id } from "@eyeseetea/d2-api";
import { Future, FutureData } from "../../../../entities/Future";
import { GlassATCHistory, createAtcVersionKey } from "../../../../entities/GlassATC";
import { RawSubstanceConsumptionData } from "../../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { SubstanceConsumptionCalculated } from "../../../../entities/data-entry/amc/SubstanceConsumptionCalculated";
import { GlassATCRepository } from "../../../../repositories/GlassATCRepository";
import { calculateConsumptionSubstanceLevelData } from "./calculationConsumptionSubstanceLevelData";

export function getConsumptionDataSubstanceLevel(params: {
    orgUnitId: Id;
    period: string;
    rawSubstanceConsumptionData: RawSubstanceConsumptionData[] | undefined;
    atcVersionHistory: GlassATCHistory[];
    atcRepository: GlassATCRepository;
}): FutureData<SubstanceConsumptionCalculated[]> {
    const { orgUnitId, period, atcRepository, rawSubstanceConsumptionData, atcVersionHistory } = params;
    if (!rawSubstanceConsumptionData) {
        console.error(`Cannot find Raw Substance Consumption Data for orgUnitsId=${orgUnitId} and period=${period}`);
        return Future.error("Cannot find Raw Substance Consumption Data");
    }

    const atcVersionKeys: string[] = Array.from(
        new Set(rawSubstanceConsumptionData?.map(({ atc_version_manual }) => atc_version_manual))
    );

    const atcCurrentVersionInfo = atcVersionHistory.find(({ currentVersion }) => currentVersion);

    if (!atcCurrentVersionInfo) {
        if (!atcCurrentVersionInfo) {
            console.error(
                `Cannot find current version of ATC in version history: ${JSON.stringify(atcVersionHistory)}`
            );
            return Future.error("Cannot find current version of ATC");
        }
    }

    const currentAtcVersionKey = createAtcVersionKey(atcCurrentVersionInfo.year, atcCurrentVersionInfo.version);

    return atcRepository.getAtcVersion(currentAtcVersionKey).flatMap(atcCurrentVersionData => {
        return atcRepository.getListOfAtcVersionsByKeys(atcVersionKeys).flatMap(atcVersionsByKeys => {
            const keysNotFound = atcVersionKeys.filter(key => !Object.keys(atcVersionsByKeys).includes(key));
            if (keysNotFound.length) {
                console.warn(`ATC data not found: keys=${keysNotFound.join(",")}`);
            }
            const allATCClassificationsByVersion = {
                ...atcVersionsByKeys,
                [currentAtcVersionKey]: atcCurrentVersionData,
            };

            const calculatedConsumptionSubstanceLevelData = calculateConsumptionSubstanceLevelData(
                period,
                orgUnitId,
                rawSubstanceConsumptionData,
                allATCClassificationsByVersion,
                currentAtcVersionKey
            );
            return Future.success(calculatedConsumptionSubstanceLevelData);
        });
    });
}
