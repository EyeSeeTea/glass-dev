import { UseCase } from "../../CompositionRoot";
import { generateUid } from "../../utils/uid";
import { Future, FutureData } from "../entities/Future";
import { GlassDocumentsRepository } from "../repositories/GlassDocumentsRepository";
import { GlassSubmissionsRepository } from "../repositories/GlassSubmissionsRepository";

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
        private glassSubmissionsRepository: GlassSubmissionsRepository
    ) {}

    public execute({ file, data }: UploadType): FutureData<string> {
        return this.glassDocumentsRepository.save(file).flatMap(fileId => {
            //TODO: Hardcoded values to be replaced when we have the full scope of dynamic values
            const submission = {
                id: generateUid(),
                batchId: data.batchId,
                call: "THy2NqRXJT2",
                countryCode: "",
                fileId,
                fileName: file.name,
                fileType: data.fileType,
                inputLineNb: 0,
                outputLineNb: 0,
                module: "",
                period: "",
                specimens: [],
                status: "uploaded",
                submissionDate: new Date().toISOString(),
            };
            return this.glassSubmissionsRepository.save(submission).flatMap(() => Future.success(submission.id));
        });
    }
}
