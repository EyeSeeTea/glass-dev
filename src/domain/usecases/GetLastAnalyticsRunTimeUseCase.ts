import { UseCase } from "../../CompositionRoot";
import { SystemInfoDefaultRepository } from "../../data/repositories/SystemInfoDefaultRepository";
import { FutureData } from "../entities/Future";

export class GetLastAnalyticsRunTimeUseCase implements UseCase {
    constructor(private systemInfoDefaultRepository: SystemInfoDefaultRepository) {}

    public execute(): FutureData<string> {
        return this.systemInfoDefaultRepository.getLastAnalyticsRunTime();
    }
}
