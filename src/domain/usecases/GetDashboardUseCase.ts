import { UseCase } from "../../CompositionRoot";
import { GlassModuleDefaultRepository } from "../../data/repositories/GlassModuleDefaultRepository";
import { Future, FutureData } from "../entities/Future";

export class GetDashboardUseCase implements UseCase {
    constructor(private glassModuleDefaultRepository: GlassModuleDefaultRepository) {}

    public execute(moduleId: string): FutureData<{ reportDashboard: string; validationDashboard: string }> {
        return this.glassModuleDefaultRepository.getById(moduleId).flatMap(module => {
            return Future.success({
                reportDashboard: module.dashboards?.reportsMenu,
                validationDashboard: module.dashboards?.validationReport,
            });
        });
    }
}
