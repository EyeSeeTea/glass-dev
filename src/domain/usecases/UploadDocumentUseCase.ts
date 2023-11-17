import { UseCase } from "../../CompositionRoot";
import { generateUid } from "../../utils/uid";
import { Future, FutureData } from "../entities/Future";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../repositories/GlassUploadsRepository";

type UploadType = {
    file: File;
    data: {
        batchId: string;
        fileType: string;
        dataSubmission: string;
        moduleId: string;
        moduleName: string;
        period: string;
        orgUnitId: string;
        orgUnitCode: string;
        rows: number;
        specimens: string[];
    };
};

export class UploadDocumentUseCase implements UseCase {
    constructor(
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository
    ) {}

    public execute({ file, data }: UploadType): FutureData<string> {
        return this.glassDocumentsRepository.save(file, data.moduleName).flatMap(fileId => {
            const upload = {
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
                status: "UPLOADED",
                uploadDate: new Date().toISOString(),
                orgUnit: data.orgUnitId,
                rows: data.rows,
                correspondingRisUploadId: "",
            };
            return this.glassUploadsRepository.save(upload).flatMap(() => Future.success(upload.id));
        });
    }
}
