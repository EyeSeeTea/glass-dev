import { Future, FutureData } from "../../domain/entities/Future";
import {
    ATCAlterationsData,
    ATCData,
    ConversionFactorData,
    createAtcVersionKey,
    DDDAlterationsData,
    DDDCombinationsData,
    DDDData,
    GlassATCHistory,
    GlassATCRecalculateDataInfo,
    GlassATCVersion,
    ListGlassATCVersions,
    validateAtcVersion,
} from "../../domain/entities/GlassATC";
import { GlassATCRepository } from "../../domain/repositories/GlassATCRepository";
import { cache } from "../../utils/cache";
import { logger } from "../../utils/logger";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

export class GlassATCDefaultRepository implements GlassATCRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    @cache()
    getAtcHistory(): FutureData<Array<GlassATCHistory>> {
        return this.dataStoreClient.listCollection<GlassATCHistory>(DataStoreKeys.ATC_CLASSIFICATION);
    }

    @cache()
    getAtcVersion(atcVersionKey: string): FutureData<GlassATCVersion> {
        if (validateAtcVersion(atcVersionKey)) {
            return this.dataStoreClient
                .listCollection<
                    ATCVersionData<
                        | DDDCombinationsData
                        | ConversionFactorData
                        | DDDData
                        | ATCData
                        | DDDAlterationsData
                        | ATCAlterationsData
                    >
                >(atcVersionKey)
                .map(atcVersionDataStore => {
                    return this.buildGlassATCVersion(atcVersionDataStore);
                });
        }
        logger.error(`ATC version ${atcVersionKey} is not valid`);
        return Future.error(`ATC version ${atcVersionKey} is not valid`);
    }

    @cache()
    getCurrentAtcVersion(): FutureData<GlassATCVersion> {
        return this.getAtcHistory().flatMap(atcVersionHistory => {
            const atcCurrentVersionInfo = atcVersionHistory.find(({ currentVersion }) => currentVersion);

            if (!atcCurrentVersionInfo) {
                logger.error(`Cannot find current version of ATC`);
                return Future.error("Cannot find current version of ATC");
            }
            const atcVersionKey = createAtcVersionKey(atcCurrentVersionInfo.year, atcCurrentVersionInfo.version);

            return this.getAtcVersion(atcVersionKey);
        });
    }

    @cache()
    getListOfAtcVersionsByKeys(atcVersionKeys: string[]): FutureData<ListGlassATCVersions> {
        return Future.joinObj(
            atcVersionKeys.reduce((acc, atcVersionKey) => {
                if (validateAtcVersion(atcVersionKey)) {
                    return {
                        ...acc,
                        [atcVersionKey]: this.getAtcVersion(atcVersionKey),
                    };
                }
                logger.error(`ATC version key not valid: ${atcVersionKey}`);
                return acc;
            }, {})
        );
    }

    getRecalculateDataInfo(): FutureData<GlassATCRecalculateDataInfo | undefined> {
        return this.dataStoreClient.getObject(DataStoreKeys.AMC_RECALCULATION);
    }

    disableRecalculations(): FutureData<void> {
        return this.getRecalculateDataInfo().flatMap(recalculateDataInfo => {
            if (!recalculateDataInfo) return Future.success(undefined);
            const newRecalculateDataInfo = {
                ...recalculateDataInfo,
                recalculate: false,
                date: new Date().toISOString(),
            };
            return this.dataStoreClient.saveObject(DataStoreKeys.AMC_RECALCULATION, newRecalculateDataInfo);
        });
    }

    private buildGlassATCVersion(atcVersionDataStore: ATCVersion): GlassATCVersion {
        const glassAtcVerion: GlassATCVersion = {
            atc: (atcVersionDataStore.find(({ name }) => name === "atc")?.data as ATCData[]) ?? [],
            ddd_combinations:
                (atcVersionDataStore.find(({ name }) => name === "ddd_combinations")?.data as DDDCombinationsData[]) ??
                [],
            ddd: (atcVersionDataStore.find(({ name }) => name === "ddd")?.data as DDDData[]) ?? [],
            conversion:
                (atcVersionDataStore.find(({ name }) => name === "conversion")?.data as ConversionFactorData[]) ?? [],
            ddd_alterations:
                (atcVersionDataStore.find(({ name }) => name === "ddd_alterations")?.data as DDDAlterationsData[]) ??
                [],
            atc_alterations:
                (atcVersionDataStore.find(({ name }) => name === "atc_alterations")?.data as ATCAlterationsData[]) ??
                [],
        };
        return glassAtcVerion;
    }
}

type ATCVersionData<T> = {
    name: "atc" | "ddd_combinations" | "ddd" | "conversion" | "ddd_alterations" | "atc_alterations";
    data: T[];
};

type ATCVersion = Array<
    ATCVersionData<
        DDDCombinationsData | ConversionFactorData | DDDData | ATCData | DDDAlterationsData | ATCAlterationsData
    >
>;
