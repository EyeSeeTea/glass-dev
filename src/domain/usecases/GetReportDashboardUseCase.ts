import { UseCase } from "../../CompositionRoot";
import { GlassModuleDefaultRepository } from "../../data/repositories/GlassModuleDefaultRepository";
import { Future, FutureData } from "../entities/Future";

export class GetReportDashboardUseCase implements UseCase {
    constructor(private glassModuleDefaultRepository: GlassModuleDefaultRepository) {}

    public execute(moduleId: string): FutureData<string> {
        return this.glassModuleDefaultRepository.getById(moduleId).flatMap(module => {
            return Future.success(module.dashboards?.reportsMenu);
        });
    }
}
