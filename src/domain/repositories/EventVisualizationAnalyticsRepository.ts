import { FutureData } from "../entities/Future";

export interface EventVisualizationAnalyticsRepository {
    downloadAllData(): FutureData<void>;
}
