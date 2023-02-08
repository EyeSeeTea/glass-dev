import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

type SetUploadStatusType = {
    id: string;
    status: "UPLOADED" | "COMPLETED" | "ERROR UPLOADING";
};

export class SetUploadStatusUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute({ id, status }: SetUploadStatusType): FutureData<void> {
        return this.glassUploadsRepository.setStatus(id, status);
    }
}
