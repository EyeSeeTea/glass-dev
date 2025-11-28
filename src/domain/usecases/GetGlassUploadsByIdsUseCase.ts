import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";
import { Id } from "../entities/Ref";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class GetGlassUploadsByIdsUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(ids: Id[]): FutureData<GlassUploads[]> {
        return this.glassUploadsRepository.getByIds(ids);
    }
}
