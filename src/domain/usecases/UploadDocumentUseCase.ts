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
    };
};

export class UploadDocumentUseCase implements UseCase {
    constructor(
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository
    ) {}

    public execute({ file, data }: UploadType): FutureData<string> {
        return this.glassDocumentsRepository.save(file).flatMap(fileId => {
            //TODO: Hardcoded values to be replaced when we have the full scope of dynamic values
            const upload = {
                id: generateUid(),
                batchId: data.batchId,
                dataSubmission: "THy2NqRXJT2",
                countryCode: "",
                fileId,
                fileName: file.name,
                fileType: data.fileType,
                inputLineNb: 0,
                outputLineNb: 0,
                module: "",
                period: "",
                specimens: [],
                status: "UPLOADED",
                uploadDate: new Date().toISOString(),
            };
            return this.glassUploadsRepository.save(upload).flatMap(() => Future.success(upload.id));
        });
    }
}
