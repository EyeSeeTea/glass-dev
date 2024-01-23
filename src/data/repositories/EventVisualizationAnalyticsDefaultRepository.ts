import { Future, FutureData } from "../../domain/entities/Future";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { apiToFuture } from "../../utils/futures";
import { EventVisualizationAnalyticsRepository } from "../../domain/repositories/EventVisualizationAnalyticsRepository";

export class EventVisualizationAnalyticsDefaultRepository implements EventVisualizationAnalyticsRepository {
    constructor(private api: D2Api) {}

    downloadAllData(): FutureData<void> {
        return apiToFuture(

            this.api.

            this.api.request<{ lastAnalyticsTableSuccess: Date; lastAnalyticsTablePartitionSuccess: Date }>({
                url: `/system/info?fields=lastAnalyticsTablePartitionSuccess,lastAnalyticsTableSuccess`,
                method: "get",
            })
        ).flatMap(response => {
           
        });
    }
}
