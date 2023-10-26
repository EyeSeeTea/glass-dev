import { Future } from "../entities/Future";
import { NamedRef } from "../entities/Ref";
import { CaptureFormRepository } from "../repositories/CaptureFormRepository";
import { amcQuestionMap } from "./ApplyAMCQuestionUpdationUseCase";

export const EAR_PROGRAM_ID = "SQe26z0smFP";
export const AMC_PROGRAM_ID = "qGG6BjULAaf";

export class GetProgramQuestionnaireQuestionsUseCase {
    constructor(private captureFormRepository: CaptureFormRepository) {}

    execute(questionnaireId: string, moduleName: string, subQuestionnaires?: NamedRef[]) {
        if (moduleName === "AMC") {
            return this.captureFormRepository.getForm(questionnaireId).flatMap(questionnaire => {
                //Sub Questionnaire split logic.
                const subQuestionnairesToDisable = amcQuestionMap
                    .filter(qm => subQuestionnaires?.some(sq => sq.id === qm.id))
                    .flatMap(sqm => sqm.questionsToDisable);

                //update questions in questionnaire
                questionnaire.sections.map(sec =>
                    sec.questions.map(q => {
                        //disable dependent questions
                        if (subQuestionnairesToDisable.find(sqd => sqd === q.id)) {
                            q.disabled = true;
                        }
                        //and disable already selected questions
                        else if (subQuestionnaires?.find(sq => sq.id === q.id)) {
                            q.disabled = true;
                        }
                    })
                );
                return Future.success(questionnaire);
            });
        } else {
            return this.captureFormRepository.getForm(questionnaireId);
        }
    }
}
