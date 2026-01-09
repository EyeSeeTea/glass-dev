import { FutureData } from "../entities/Future";
import {
    ATCVersionKey,
    GlassATCHistory,
    GlassATCRecalculateDataInfo,
    GlassAtcVersionData,
    ListGlassATCLastVersionKeysByYear,
    ListGlassATCVersions,
} from "../entities/GlassAtcVersionData";

export interface GlassATCRepository {
    getAtcHistory(): FutureData<Array<GlassATCHistory>>;
    getAtcVersion(atcVersionKey: string): FutureData<GlassAtcVersionData>;
    getCurrentAtcVersion(): FutureData<GlassAtcVersionData>;
    getListOfAtcVersionsByKeys(atcVersionKeys: string[]): FutureData<ListGlassATCVersions>;
    getRecalculateDataInfo(): FutureData<GlassATCRecalculateDataInfo | undefined>;
    disableRecalculations(): FutureData<void>;
    getLastAtcVersionKeyYear(year: string): FutureData<ATCVersionKey>;
    getListOfLastAtcVersionsKeysByYears(years: string[]): FutureData<ListGlassATCLastVersionKeysByYear>;
    getCurrentAtcVersionKey(): FutureData<ATCVersionKey>;
}
