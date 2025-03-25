import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassUploadsStatus } from "../entities/GlassUploads";
import { Id } from "../entities/Ref";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export type SetUploadStatusType = {
    id: Id;
    status: GlassUploadsStatus;
};

export class SetUploadStatusUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute({ id, status }: SetUploadStatusType): FutureData<void> {
        return this.glassUploadsRepository.setStatus(id, status);
    }
}
