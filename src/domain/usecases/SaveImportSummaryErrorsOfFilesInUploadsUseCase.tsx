import { UseCase } from "../../CompositionRoot";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { ImportSummaryErrors } from "../entities/data-entry/ImportSummary";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

export class SaveImportSummaryErrorsOfFilesInUploadsUseCase implements UseCase {
    constructor(private glassUploadsRepository: GlassUploadsRepository) {}

    public execute(params: {
        primaryUploadId: Id;
        primaryImportSummaryErrors: ImportSummaryErrors;
        secondaryUploadId?: Id;
        secondaryImportSummaryErrors?: ImportSummaryErrors;
    }): FutureData<void> {
        const { primaryUploadId, primaryImportSummaryErrors, secondaryUploadId, secondaryImportSummaryErrors } = params;
        return this.glassUploadsRepository.saveImportSummaryErrorsOfFilesInUploads({
            primaryUploadId,
            primaryImportSummaryErrors,
            secondaryUploadId,
            secondaryImportSummaryErrors,
        });
    }
}
