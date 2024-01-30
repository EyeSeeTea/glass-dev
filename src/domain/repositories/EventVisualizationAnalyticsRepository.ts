import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";

export interface EventVisualizationAnalyticsRepository {
    downloadAllData(lineListId: Id, module: string): FutureData<Blob>;
}
