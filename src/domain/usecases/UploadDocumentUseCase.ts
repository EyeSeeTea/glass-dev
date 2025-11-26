import { UseCase } from "../../CompositionRoot";
import { generateUid } from "../../utils/uid";
import { Future, FutureData } from "../entities/Future";
import { GlassUploads } from "../entities/GlassUploads";
import { AsyncPreprocessingRepository } from "../repositories/AsyncPreprocessingRepository";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

type UploadData = {
    batchId: string;
    fileType: string;
    dataSubmission: string;
    moduleId: string;
    moduleName: string;
    period: string;
    orgUnitId: string;
    orgUnitCode: string;
    rows?: number;
    specimens?: string[];
};

type UploadType = {
    file: File;
    data: UploadData;
    status: "PREPROCESSING" | "UPLOADED";
};

export class UploadDocumentUseCase implements UseCase {
    constructor(
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private asyncPreprocessingRepository: AsyncPreprocessingRepository
    ) {}

    public execute({ file, data, status }: UploadType): FutureData<string> {
        return this.glassDocumentsRepository.save(file, data.moduleName).flatMap(fileId => {
            const upload: GlassUploads = {
                id: generateUid(),
                batchId: data.batchId,
                dataSubmission: data.dataSubmission,
                countryCode: data.orgUnitCode,
                fileId,
                fileName: file.name,
                fileType: data.fileType,
                inputLineNb: 0,
                outputLineNb: 0,
                module: data.moduleId,
                period: data.period,
                specimens: data.specimens,
                status: status,
                uploadDate: new Date().toISOString(),
                orgUnit: data.orgUnitId,
                rows: data.rows,
                correspondingRisUploadId: "",
            };
            return this.glassUploadsRepository.save(upload).flatMap(() => {
                if (status === "PREPROCESSING") {
                    return this.asyncPreprocessingRepository.set(upload.id).map(() => upload.id);
                }
                return Future.success(upload.id);
            });
        });
    }
}
