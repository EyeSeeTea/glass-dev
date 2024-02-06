import { UseCase } from "../../CompositionRoot";
import { GlassModuleDefaultRepository } from "../../data/repositories/GlassModuleDefaultRepository";
import { FutureData, Future } from "../entities/Future";
import { LineListDetails } from "../entities/GlassModule";
import { EventVisualizationAnalyticsRepository } from "../repositories/EventVisualizationAnalyticsRepository";

export class DownloadAllDataButtonData implements UseCase {
    constructor(
        private eventVisualizationRepository: EventVisualizationAnalyticsRepository,
        private glassModuleDefaultRepository: GlassModuleDefaultRepository
    ) {}

    public execute(moduleName: string): FutureData<LineListDetails[]> {
        return this.glassModuleDefaultRepository.getByName(moduleName).flatMap(module => {
            if (module.lineLists) {
                const downloadData = module.lineLists.map(lineListdetails => {
                    return this.eventVisualizationRepository
                        .getLineListName(lineListdetails.id)
                        .flatMap(lineListName => {
                            const lineList: LineListDetails = { ...lineListdetails, name: lineListName };
                            return Future.success(lineList);
                        });
                });

                return Future.sequential(downloadData);
            } else {
                return Future.error("Cannot find line listing id for given module");
            }
        });
    }
}
