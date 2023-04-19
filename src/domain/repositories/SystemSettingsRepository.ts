import { FutureData } from "../entities/Future";

export interface SystemSettingsRepository {
    getLastAnalyticsRunTime(): FutureData<Date>;
}
