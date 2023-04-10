import { FutureData } from "../entities/Future";

export interface GlassDashboardsRepository {
    getReportMenuDashboard(): FutureData<string>;
    getReviewSummaryDashboard(): FutureData<string>;
}
