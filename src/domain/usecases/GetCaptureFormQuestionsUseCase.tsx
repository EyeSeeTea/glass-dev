import { CaptureFormRepository } from "../repositories/CaptureFormRepository";
import { EAR_PROGRAM_ID } from "./data-entry/ear/ImportCaptureDataUseCase";

export class GetCaptureFormQuestionsUseCase {
    constructor(private captureFormRepository: CaptureFormRepository) {}

    execute(programId: string) {
        //If program id is not specified, then consider it as EAR program, if not use the specified
        const programIdProcessed = programId === "" ? EAR_PROGRAM_ID : programId;
        return this.captureFormRepository.getForm(programIdProcessed);
    }
}
