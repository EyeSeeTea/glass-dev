import { Future } from "../entities/Future";
import { NamedRef } from "../entities/Ref";
import { CaptureFormRepository } from "../repositories/CaptureFormRepository";
import { amcQuestionMap } from "./ApplyAMCQuestionUpdationUseCase";
import { AMC_PROGRAM_ID, EAR_PROGRAM_ID } from "./GetProgramQuestionnaireQuestionsUseCase";

export class GetPopulatedProgramQuestionnaireQuestionsUseCase {
    constructor(private captureFormRepository: CaptureFormRepository) {}

    execute(eventId: string, moduleName: string, subQuestionnaires?: NamedRef[]) {
        return this.captureFormRepository.getSignalEvent(eventId).flatMap(event => {
            if (moduleName === "EAR") {
                return this.captureFormRepository.getPopulatedForm(event, EAR_PROGRAM_ID);
            } else {
                return this.captureFormRepository.getPopulatedForm(event, AMC_PROGRAM_ID).flatMap(questionnaire => {
                    //Sub Questionnaire split logic.
                    const subQuestionnairesToDisable = amcQuestionMap
                        .filter(qm => subQuestionnaires?.some(sq => sq.id === qm.id))
                        .flatMap(sqm => sqm.questionsToDisable);

                    //update questions in questionnaire
                    questionnaire.sections.map(sec =>
                        sec.questions.map(q => {
                            if (subQuestionnairesToDisable.find(sqd => sqd === q.id)) {
                                q.disabled = true;
                            }
                            //and disable already selected questions
                            else if (subQuestionnaires?.find(sq => sq.id === q.id) && q.value !== true) {
                                // q.value = true;
                                q.disabled = true;
                            }
                        })
                    );
                    return Future.success(questionnaire);
                });
            }
        });
    }
}
