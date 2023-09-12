import { CaptureFormRepository } from "../repositories/CaptureFormRepository";

export class GetSignalEventUseCase {
    constructor(private captureFormRepository: CaptureFormRepository) {}

    execute(eventId: string) {
        return this.captureFormRepository.getSignalEvent(eventId).flatMap(event => {
            return this.captureFormRepository.getPopulatedForm(event);
        });
    }
}
