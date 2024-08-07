import { Future, FutureData } from "../../domain/entities/Future";
import {
    ATCVersionKey,
    createAtcVersionKey,
    getYearFromAtcVersionKey,
    GlassATCHistory,
    GlassATCRecalculateDataInfo,
    GlassAtcVersionData,
    ListGlassATCLastVersionKeysByYear,
    ListGlassATCVersions,
    UnitCode,
    UnitName,
    UnitsData,
    validateAtcVersion,
} from "../../domain/entities/GlassAtcVersionData";
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
    getAtcVersion(atcVersionKey: string): FutureData<GlassAtcVersionData> {
        if (validateAtcVersion(atcVersionKey)) {
            return this.dataStoreClient.getObject<GlassAtcVersionData>(atcVersionKey).flatMap(atcVersionDataStore => {
                if (atcVersionDataStore) {
                    return Future.success(this.buildGlassAtcVersionDataWithCorrectNames(atcVersionDataStore));
                }
                logger.error(`[${new Date().toISOString()}] ATC version ${atcVersionKey} not found`);
                return Future.error(`ATC version ${atcVersionKey} not found`);
            });
        }
        logger.error(`[${new Date().toISOString()}] ATC version ${atcVersionKey} is not valid`);
        return Future.error(`ATC version ${atcVersionKey} is not valid`);
    }

    @cache()
    getCurrentAtcVersion(): FutureData<GlassAtcVersionData> {
        return this.getAtcHistory().flatMap(atcVersionHistory => {
            const atcCurrentVersionInfo = atcVersionHistory.find(({ currentVersion }) => currentVersion);

            if (!atcCurrentVersionInfo) {
                logger.error(`[${new Date().toISOString()}] Cannot find current version of ATC`);
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
                logger.error(`[${new Date().toISOString()}] ATC version key not valid: ${atcVersionKey}`);
                return acc;
            }, {})
        );
    }

    @cache()
    getLastAtcVersionKeyYear(year: string): FutureData<ATCVersionKey> {
        return this.getAtcHistory().flatMap(atcVersionHistory => {
            const atcHistorySortedByLastVersionOfYear = atcVersionHistory
                .filter(atcHistory => atcHistory.year.toString() === year)
                .sort((atcHistoryA, atcHistoryB) => atcHistoryB.version - atcHistoryA.version);

            const lastVersionOfYear = atcHistorySortedByLastVersionOfYear[0];

            if (!lastVersionOfYear) {
                return Future.error(`Cannot find an ATC version for the given year in ATCs history: ${year}`);
            }
            const atcVersionKey = createAtcVersionKey(lastVersionOfYear.year, lastVersionOfYear.version);

            return this.getAtcVersion(atcVersionKey).flatMap(atcVersionData => {
                if (!atcVersionData) {
                    return Future.error("Cannot find an ATC version data for the given year");
                }

                return Future.success(atcVersionKey);
            });
        });
    }

    @cache()
    getListOfLastAtcVersionsKeysByYears(years: string[]): FutureData<ListGlassATCLastVersionKeysByYear> {
        return Future.sequential(years.map(year => this.getLastAtcVersionKeyYear(year))).flatMap(atcVersionKeys => {
            const list = atcVersionKeys.reduce((acc, atcVersionKey) => {
                const year = getYearFromAtcVersionKey(atcVersionKey);
                return year
                    ? {
                          ...acc,
                          [year]: atcVersionKey,
                      }
                    : acc;
            }, {});

            return Future.success(list);
        });
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

    private buildGlassAtcVersionDataWithCorrectNames(glassAtcVersionData: GlassAtcVersionData): GlassAtcVersionData {
        return {
            ...glassAtcVersionData,
            roas: glassAtcVersionData.roas.map(roa => ({ ...roa, NAME: roa.NAME.toLowerCase().replace(/_/g, " ") })),
            salts: glassAtcVersionData.salts.map(salt => ({
                ...salt,
                NAME: salt.NAME.toLowerCase().replace(/_/g, " "),
            })),
            units: glassAtcVersionData.units.map(unit => ({
                ...unit,
                NAME: unit.NAME.toLowerCase().replace(/_/g, " "),
                UNIT_FAMILY: this.getUnitFamilyCode(
                    glassAtcVersionData.units,
                    unit?.UNIT_FAMILY?.toLowerCase()?.replace(/_/g, " ")
                ),
            })),
        };
    }

    private getUnitFamilyCode(unitsData: UnitsData[], unitFamilyName: UnitName | undefined): UnitCode | undefined {
        return unitsData.find(unit => unit.NAME === unitFamilyName)?.UNIT;
    }
}
