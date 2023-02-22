import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { UserAccessInfo } from "../entities/User";
import { InstanceRepository } from "../repositories/InstanceRepository";

export class GetCurrentUserUseCase implements UseCase {
    constructor(private instanceRepository: InstanceRepository) {}

    public execute(): FutureData<UserAccessInfo> {
        return this.instanceRepository.getCurrentUser();
    }
}
