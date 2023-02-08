import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

type SetUploadBatchIdType = {
    id: string;
    batchId: string;
};

export class SetUploadBatchIdUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute({ id, batchId }: SetUploadBatchIdType): FutureData<void> {
        return this.glassUploadsRepository.setBatchId(id, batchId);
    }
}
