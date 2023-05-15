import { FutureData } from "../entities/Future";

export interface SystemInfoRepository {
    getLastAnalyticsRunTime(): FutureData<string>;
}
