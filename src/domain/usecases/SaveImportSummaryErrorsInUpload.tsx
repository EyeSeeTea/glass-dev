import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { ImportSummaryErrors } from "../entities/data-entry/ImportSummary";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class SaveImportSummaryErrorsInUpload implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(uploadId: Id, importSummaryErrors: ImportSummaryErrors): FutureData<void> {
        return this.glassUploadsRepository.saveImportSummaryErrorsInUpload(uploadId, importSummaryErrors);
    }
}
