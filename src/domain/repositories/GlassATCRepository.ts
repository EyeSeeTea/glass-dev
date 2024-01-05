import { FutureData } from "../entities/Future";
import { GlassATCHistory, GlassATCVersion } from "../entities/GlassATC";

export interface GlassATCRepository {
    getAtcHistory(): FutureData<Array<GlassATCHistory>>;
    getAtcVersion(atcVersionKey: string): FutureData<GlassATCVersion>;
}
