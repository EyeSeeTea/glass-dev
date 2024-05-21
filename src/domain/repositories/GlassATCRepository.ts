import { FutureData } from "../entities/Future";
import {
    GlassATCHistory,
    GlassATCRecalculateDataInfo,
    GlassAtcVersionData,
    ListGlassATCVersions,
} from "../entities/GlassAtcVersionData";

export interface GlassATCRepository {
    getAtcHistory(): FutureData<Array<GlassATCHistory>>;
    getAtcVersion(atcVersionKey: string): FutureData<GlassAtcVersionData>;
    getCurrentAtcVersion(): FutureData<GlassAtcVersionData>;
    getListOfAtcVersionsByKeys(atcVersionKeys: string[]): FutureData<ListGlassATCVersions>;
    getRecalculateDataInfo(): FutureData<GlassATCRecalculateDataInfo | undefined>;
    disableRecalculations(): FutureData<void>;
}
