import { UseCase } from "../../CompositionRoot";
import { SystemSettingsDefaultRepository } from "../../data/repositories/SystemSettingsDefaultRepository";
import { FutureData } from "../entities/Future";

export class GetLastAnalyticsRunTimeUseCase implements UseCase {
    constructor(private systemSettingsDefaultRepository: SystemSettingsDefaultRepository) {}

    public execute(): FutureData<Date> {
        return this.systemSettingsDefaultRepository.getLastAnalyticsRunTime();
    }
}
