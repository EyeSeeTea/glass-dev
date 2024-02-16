import { FutureData } from "../entities/Future";
import {
    GlassATCHistory,
    GlassATCRecalculateDataInfo,
    GlassATCVersion,
    ListGlassATCVersions,
} from "../entities/GlassATC";

export interface GlassATCRepository {
    getAtcHistory(): FutureData<Array<GlassATCHistory>>;
    getAtcVersion(atcVersionKey: string): FutureData<GlassATCVersion>;
    getCurrentAtcVersion(): FutureData<GlassATCVersion>;
    getListOfAtcVersionsByKeys(atcVersionKeys: string[]): FutureData<ListGlassATCVersions>;
    getRecalculateDataInfo(): FutureData<GlassATCRecalculateDataInfo | undefined>;
    disableRecalculations(): FutureData<void>;
}
