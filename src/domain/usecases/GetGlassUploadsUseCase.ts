import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class GetGlassUploadsUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(): FutureData<GlassUploads[]> {
        return this.glassUploadsRepository.getAll();
    }
}
