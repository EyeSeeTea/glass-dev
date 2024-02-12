import { Id } from "@eyeseetea/d2-api";
import { Future, FutureData } from "../../../../entities/Future";
import { GlassATCVersion } from "../../../../entities/GlassATC";
import { RawSubstanceConsumptionData } from "../../../../entities/data-entry/amc/RawSubstanceConsumptionData";
import { SubstanceConsumptionCalculated } from "../../../../entities/data-entry/amc/SubstanceConsumptionCalculated";
import { GlassATCRepository } from "../../../../repositories/GlassATCRepository";
import { calculateConsumptionSubstanceLevelData } from "./calculationConsumptionSubstanceLevelData";
import { logger } from "../../../../../utils/logger";

export function getConsumptionDataSubstanceLevel(params: {
    orgUnitId: Id;
    period: string;
    rawSubstanceConsumptionData: RawSubstanceConsumptionData[] | undefined;
    atcCurrentVersionData: GlassATCVersion;
    currentAtcVersionKey: string;
    atcRepository: GlassATCRepository;
}): FutureData<SubstanceConsumptionCalculated[]> {
    const {
        orgUnitId,
        period,
        atcRepository,
        rawSubstanceConsumptionData,
        atcCurrentVersionData,
        currentAtcVersionKey,
    } = params;
    if (!rawSubstanceConsumptionData) {
        logger.error(`Cannot find Raw Substance Consumption Data for orgUnitsId ${orgUnitId} and period ${period}`);
        return Future.error("Cannot find Raw Substance Consumption Data");
    }

    const atcVersionKeys: string[] = Array.from(
        new Set(rawSubstanceConsumptionData?.map(({ atc_version_manual }) => atc_version_manual))
    );

    return atcRepository.getListOfAtcVersionsByKeys(atcVersionKeys).flatMap(atcVersionsByKeys => {
        const keysNotFound = atcVersionKeys.filter(key => !Object.keys(atcVersionsByKeys).includes(key));
        if (keysNotFound.length) {
            logger.error(
                `ATC data not found for these versions: ${keysNotFound.join(
                    ","
                )}. Calculated consumption data for raw substance consumption data with these ATC versions manual will not be calculated.`
            );
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
}
