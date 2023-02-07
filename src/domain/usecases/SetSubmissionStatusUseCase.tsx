import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassSubmissionsRepository } from "../repositories/GlassSubmissionsRepository";

type SetSubmissionStatusType = {
    id: string;
    status: "UPLOADED" | "COMPLETED" | "ERROR UPLOADING";
};

export class SetSubmissionStatusUseCase implements UseCase {
    constructor(private glassSubmissionsRepository: GlassSubmissionsRepository) {}

    public execute({ id, status }: SetSubmissionStatusType): FutureData<void> {
        return this.glassSubmissionsRepository.setStatus(id, status);
    }
}
