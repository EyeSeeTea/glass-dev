import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { LineListDetails } from "../entities/GlassModule";
import { EventVisualizationAnalyticsRepository } from "../repositories/EventVisualizationAnalyticsRepository";

export class DownloadAllDataForModuleUseCase implements UseCase {
    constructor(private eventVisualizationRepository: EventVisualizationAnalyticsRepository) {}

    public execute(lineListDetails: LineListDetails): FutureData<Blob> {
        return this.eventVisualizationRepository.downloadAllData(lineListDetails);
    }
}
