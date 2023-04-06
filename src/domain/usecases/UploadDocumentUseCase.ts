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
        module: string;
        period: string;
        orgUnit: string;
        records: number;
    };
};

export class UploadDocumentUseCase implements UseCase {
    constructor(
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository
    ) {}

    public execute({ file, data }: UploadType): FutureData<string> {
        return this.glassDocumentsRepository.save(file).flatMap(fileId => {
            const upload = {
                id: generateUid(),
                batchId: data.batchId,
                dataSubmission: data.dataSubmission,
                countryCode: "",
                fileId,
                fileName: file.name,
                fileType: data.fileType,
                inputLineNb: 0,
                outputLineNb: 0,
                module: data.module,
                period: data.period,
                specimens: [],
                status: "UPLOADED",
                uploadDate: new Date().toISOString(),
                orgUnit: data.orgUnit,
                records: data.records,
                correspondingRisFileUploadId: "",
            };
            return this.glassUploadsRepository.save(upload).flatMap(() => Future.success(upload.id));
        });
    }
}
