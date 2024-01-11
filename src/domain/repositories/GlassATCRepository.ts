import { FutureData } from "../entities/Future";
import { GlassATCHistory, GlassATCVersion, ListGlassATCVersions } from "../entities/GlassATC";

export interface GlassATCRepository {
    getAtcHistory(): FutureData<Array<GlassATCHistory>>;
    getAtcVersion(atcVersionKey: string): FutureData<GlassATCVersion>;
    getCurrentAtcVersion(): FutureData<GlassATCVersion>;
    getListOfAtcVersionsByKeys(atcVersionKeys: string[]): FutureData<ListGlassATCVersions>;
}
