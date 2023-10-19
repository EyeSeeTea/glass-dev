import { CaptureFormRepository } from "../repositories/CaptureFormRepository";

export const EAR_PROGRAM_ID = "SQe26z0smFP";
export const AMC_PROGRAM_ID = "qGG6BjULAaf";

export class GetCaptureFormQuestionsUseCase {
    constructor(private captureFormRepository: CaptureFormRepository) {}

    execute(questionnaireId: string) {
        return this.captureFormRepository.getForm(questionnaireId);
    }
}
