import { CaptureFormRepository } from "../repositories/CaptureFormRepository";

export class GetCaptureFormQuestionsUseCase {
    constructor(private captureFormRepository: CaptureFormRepository) {}

    execute() {
        return this.captureFormRepository.getForm();
    }
}
