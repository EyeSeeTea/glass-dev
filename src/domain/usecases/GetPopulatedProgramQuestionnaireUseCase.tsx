import { Future, FutureData } from "../entities/Future";
import { Questionnaire } from "../entities/Questionnaire";
import { NamedRef } from "../entities/Ref";
import { CaptureFormRepository } from "../repositories/CaptureFormRepository";
import { amcQuestionMap } from "./ApplyAMCQuestionUpdationUseCase";
import { AMC_DATA_Q_GENERAL_SECTION_TITLE, AMC_PROGRAM_ID, EAR_PROGRAM_ID } from "./GetProgramQuestionnaireUseCase";

export class GetPopulatedProgramQuestionnaireUseCase {
    constructor(private captureFormRepository: CaptureFormRepository) {}

    execute(
        eventId: string,
        moduleName: string,
        subQuestionnaires?: NamedRef[],
        parentEventId?: string
    ): FutureData<Questionnaire> {
        return this.captureFormRepository.getSignalEvent(eventId).flatMap(event => {
            if (moduleName === "EAR") {
                return this.captureFormRepository.getPopulatedForm(event, EAR_PROGRAM_ID);
            } else if (moduleName === "AMC") {
                return Future.joinObj({
                    questionnaire: this.captureFormRepository.getPopulatedForm(event, AMC_PROGRAM_ID),
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
                                if (subQuestionnairesToDisable.find(sqd => sqd === q.id)) {
                                    q.disabled = true;
                                }
                                //and disable already selected questions
                                else if (subQuestionnaires?.find(sq => sq.id === q.id) && q.value !== true) {
                                    q.disabled = true;
                                }
                            });
                        }
                    });
                    return Future.success(questionnaire);
                });
            } else {
                return Future.error("Unknown module type");
            }
        });
    }
}
