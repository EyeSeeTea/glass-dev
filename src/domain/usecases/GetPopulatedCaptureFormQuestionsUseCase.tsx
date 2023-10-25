import { CaptureFormRepository } from "../repositories/CaptureFormRepository";
import { AMC_PROGRAM_ID, EAR_PROGRAM_ID } from "./GetCaptureFormQuestionsUseCase";

export class GetPopulatedCaptureFormQuestionsUseCase {
    constructor(private captureFormRepository: CaptureFormRepository) {}

    execute(eventId: string, moduleName: string) {
        return this.captureFormRepository.getSignalEvent(eventId).flatMap(event => {
            if (moduleName === "EAR") {
                return this.captureFormRepository.getPopulatedForm(event, EAR_PROGRAM_ID);
            } else {
                return this.captureFormRepository.getPopulatedForm(event, AMC_PROGRAM_ID);
            }
        });
    }
}
