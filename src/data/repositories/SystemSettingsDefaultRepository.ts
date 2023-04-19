import { Future, FutureData } from "../../domain/entities/Future";
import { SystemSettingsRepository } from "../../domain/repositories/SystemSettingsRepository";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { apiToFuture } from "../../utils/futures";

export class SystemSettingsDefaultRepository implements SystemSettingsRepository {
    constructor(private api: D2Api) {}

    getLastAnalyticsRunTime(): FutureData<Date> {
        return apiToFuture(
            this.api.request<{ keyLastSuccessfulAnalyticsTablesUpdate: Date }>({
                url: `/systemSettings?key=keyLastSuccessfulAnalyticsTablesUpdate`,
                method: "get",
            })
        ).flatMap(response => {
            if (response) return Future.success(response.keyLastSuccessfulAnalyticsTablesUpdate);
            else return Future.error("Error fetching last analytics run time ");
        });
    }
}
