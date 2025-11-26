import { UseCase } from "../../../CompositionRoot";
import { generateUid } from "../../../utils/uid";
import { Future, FutureData } from "../../entities/Future";
import { GlassUploads } from "../../entities/GlassUploads";
import { GlassDocumentsRepository } from "../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../repositories/GlassUploadsRepository";

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

export class ValidateAndUploadFileUseCase implements UseCase {
    constructor(
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository
    ) {}

    public execute(type: "PRIMARY" | "SECONDARY", { file, data, status }: UploadType): FutureData<string> {
        return this.upload({ file, data, status });
    }

    private upload({ file, data, status }: UploadType): FutureData<string> {
        return this.glassDocumentsRepository.save(file, data.moduleName).flatMap(fileId => {
            const uploadBase = {
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

                uploadDate: new Date().toISOString(),
                orgUnit: data.orgUnitId,
                rows: data.rows,
                correspondingRisUploadId: "",
            };
            if (status === "PREPROCESSING") {
                const upload: GlassUploads = {
                    ...uploadBase,
                    status: status,
                    specimens: undefined,
                };
                return this.glassUploadsRepository.save(upload).flatMap(() => Future.success(upload.id));
            } else {
                const upload: GlassUploads = {
                    ...uploadBase,
                    specimens: data.specimens ?? [],
                    status: status,
                };
                return this.glassUploadsRepository.save(upload).flatMap(() => Future.success(upload.id));
            }
        });
    }
}
