import { CaptureFormRepository } from "../repositories/CaptureFormRepository";

export class GetCaptureFormQuestions {
    constructor(private captureFormRepository: CaptureFormRepository) {}

    execute() {
        return this.captureFormRepository.getForm();
    }
}
