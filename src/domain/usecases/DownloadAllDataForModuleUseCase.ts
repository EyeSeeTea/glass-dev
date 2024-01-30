import { UseCase } from "../../CompositionRoot";
import { GlassModuleDefaultRepository } from "../../data/repositories/GlassModuleDefaultRepository";
import { FutureData, Future } from "../entities/Future";
import { EventVisualizationAnalyticsRepository } from "../repositories/EventVisualizationAnalyticsRepository";

export class DownloadAllDataForModuleUseCase implements UseCase {
    constructor(
        private eventVisualizationRepository: EventVisualizationAnalyticsRepository,
        private glassModuleDefaultRepository: GlassModuleDefaultRepository
    ) {}

    public execute(moduleName: string): FutureData<Blob> {
        return this.glassModuleDefaultRepository.getByName(moduleName).flatMap(module => {
            if (module.lineListId) {
                return this.eventVisualizationRepository.downloadAllData(module.lineListId, moduleName);
            } else {
                return Future.error("Cannot fine saved line list id for given module");
            }
        });
    }
}
