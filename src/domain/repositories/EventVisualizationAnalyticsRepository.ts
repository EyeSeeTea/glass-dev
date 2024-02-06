import { FutureData } from "../entities/Future";
import { LineListDetails } from "../entities/GlassModule";
import { Id } from "../entities/Ref";

export interface EventVisualizationAnalyticsRepository {
    getLineListName(lineListId: Id): FutureData<string>;
    downloadAllData(lineListDetails: LineListDetails): FutureData<Blob>;
}
