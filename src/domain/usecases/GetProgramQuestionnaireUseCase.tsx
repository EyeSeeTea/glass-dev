import { Future } from "../entities/Future";
import { Id, NamedRef } from "../entities/Ref";
import { CaptureFormRepository } from "../repositories/CaptureFormRepository";
import { amcQuestionMap } from "./ApplyAMCQuestionUpdationUseCase";

export const EAR_PROGRAM_ID = "SQe26z0smFP";
export const AMC_PROGRAM_ID = "qGG6BjULAaf";
export const AMC_DATA_Q_GENERAL_SECTION_TITLE = "Data General Questionnaire";

export class GetProgramQuestionnaireUseCase {
    constructor(private captureFormRepository: CaptureFormRepository) {}

    execute(questionnaireId: string, moduleName: string, subQuestionnaires?: NamedRef[], parentEventId?: Id) {
        if (moduleName === "AMC") {
            return Future.joinObj({
                questionnaire: this.captureFormRepository.getForm(questionnaireId),
                parentEvent: parentEventId
                    ? this.captureFormRepository.getSignalEvent(parentEventId)
                    : Future.success(null),
            }).flatMap(({ questionnaire, parentEvent }) => {
                //Sub Questionnaire split logic.
                const subQuestionnairesToDisable = amcQuestionMap
                    .filter(qm => subQuestionnaires?.some(sq => sq.id === qm.id))
                    .flatMap(sqm => sqm.questionsToDisable);

                //update questions in questionnaire
                questionnaire.sections.map(sec => {
                    if (sec.title === AMC_DATA_Q_GENERAL_SECTION_TITLE && parentEvent) {
                        return sec.questions.map(question => {
                            question.disabled = true;
                            const populatedQuestion = parentEvent?.dataValues.find(
                                dv => dv.dataElement === question.id
                            );
                            if (question.type === "boolean") {
                                question.value = populatedQuestion?.value === "true" ? true : false;
                            } else if (question.type === "date") {
                                question.value = populatedQuestion?.value
                                    ? new Date(populatedQuestion?.value as string)
                                    : new Date();
                            } else question.value = populatedQuestion?.value;
                        });
                    } else {
                        return sec.questions.map(q => {
                            //disable dependent questions
                            if (subQuestionnairesToDisable.find(sqd => sqd === q.id)) {
                                q.disabled = true;
                            }
                            //and disable already selected questions
                            else if (subQuestionnaires?.find(sq => sq.id === q.id)) {
                                q.disabled = true;
                            }
                        });
                    }
                });
                return Future.success(questionnaire);
            });
        } else {
            return this.captureFormRepository.getForm(questionnaireId);
        }
    }
}
