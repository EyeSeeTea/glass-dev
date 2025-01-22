import { FutureData } from "../entities/Future";
import { GlassGeneralInfo } from "../entities/GlassGeneralInfo";

export interface GeneralInfoRepository {
    get(): FutureData<GlassGeneralInfo>;
}
