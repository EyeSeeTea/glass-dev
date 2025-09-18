import { UseCase } from "../../../CompositionRoot";
import { Future, FutureData } from "../../entities/Future";
import { ImportSummary } from "../../entities/data-entry/ImportSummary";
import { DEFAULT_ASYNC_UPLOAD_DELETE_CHUNK_SIZE, GlassModule } from "../../entities/GlassModule";
import { Id } from "../../entities/Ref";
import { AsyncImportSampleFile } from "./amr/AsyncImportSampleFile";
import { SampleDataRepository } from "../../repositories/data-entry/SampleDataRepository";
import { MetadataRepository } from "../../repositories/MetadataRepository";
import { DataValuesRepository } from "../../repositories/data-entry/DataValuesRepository";
import { GlassUploadsRepository } from "../../repositories/GlassUploadsRepository";

export class AsyncImportSecondaryFileUseCase implements UseCase {
    constructor(
        private repositories: {
            sampleDataRepository: SampleDataRepository;
            metadataRepository: MetadataRepository;
            dataValuesRepository: DataValuesRepository;
            glassUploadsRepository: GlassUploadsRepository;
        }
    ) {}

    public execute(params: {
        secondaryUploadId: Id;
        inputBlob: Blob;
        batchId: string;
        glassModule: GlassModule;
        period: string;
        orgUnitId: Id;
        countryCode: string;
        dryRun: boolean;
    }): FutureData<ImportSummary[]> {
        const { secondaryUploadId, inputBlob, batchId, glassModule, period, orgUnitId, countryCode, dryRun } = params;
        switch (glassModule.name) {
            case "AMR - Individual": {
                const uploadChunkSize =
                    glassModule.asyncUploadChunkSizes?.secondaryUpload || DEFAULT_ASYNC_UPLOAD_DELETE_CHUNK_SIZE;

                const importSampleFile = new AsyncImportSampleFile(this.repositories);

                return importSampleFile.import({
                    uploadId: secondaryUploadId,
                    inputBlob: inputBlob,
                    uploadChunkSize: uploadChunkSize,
                    batchId: batchId,
                    period: period,
                    orgUnitId: orgUnitId,
                    countryCode: countryCode,
                    dryRun: dryRun,
                });
            }

            default:
                return Future.error(`Module ${glassModule.name} not implemented`);
        }
    }
}
