import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { NamedRef } from "../entities/Ref";
import { ModuleAccess } from "../entities/User";
import { InstanceRepository } from "../repositories/InstanceRepository";

export class GetCurrentUserModulesAccessUseCase implements UseCase {
    constructor(private instanceRepository: InstanceRepository) {}

    public execute(userGroups: NamedRef[]): FutureData<ModuleAccess[]> {
        return this.instanceRepository.getCurrentUserModuleAccessData(userGroups);
    }
}
