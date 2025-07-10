import { FutureData } from "../../../domain/entities/Future";
import { D2Api } from "../../../types/d2-api";
import { QuestionsAMCQuestionnaireRepository } from "../../../domain/repositories/amc-questionnaires/QuestionsAMCQuestionnaireRepository";
import {
    AMCQuestionId,
    AMCQuestionnaireQuestions,
} from "../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import {
    AMClassAMCQuestionnaireByTEAIds,
    AMR_GLASS_AMC_AM_CLASS_QUESTIONNAIRE_CODE,
    AMR_GLASS_AMC_AM_COMPONENT_QUESTIONNAIRE_CODE,
    ComponentAMCQuestionnaireByTEAIds,
    generalAMCQuestionnaireByTEAIds,
} from "./AMCQuestionnaireConstants";
import { D2ProgramMetadata, getAMCQuestionnaireProgramMetadata } from "./getAMCQuestionnaireProgramMetadata";

export class QuestionsAMCQuestionnaireD2Repository implements QuestionsAMCQuestionnaireRepository {
    constructor(private api: D2Api) {}

    public get(): FutureData<AMCQuestionnaireQuestions> {
        return getAMCQuestionnaireProgramMetadata(this.api).map((programMetadata: D2ProgramMetadata) => {
            const generalAMCQuestions = programMetadata.programTrackedEntityAttributes?.reduce(
                (acc: AMCQuestionnaireQuestions, attribute): AMCQuestionnaireQuestions => {
                    const questionId = generalAMCQuestionnaireByTEAIds[attribute.trackedEntityAttribute.id];
                    return questionId
                        ? [
                              ...acc,
                              {
                                  text: attribute.trackedEntityAttribute.displayFormName || "",
                                  description: attribute.trackedEntityAttribute.displayDescription || undefined,
                                  id: questionId,
                              },
                          ]
                        : acc;
                },
                []
            );

            const amClassAMCQuestions = this.getQuestionsFromProgramStage(
                programMetadata.programStages,
                AMR_GLASS_AMC_AM_CLASS_QUESTIONNAIRE_CODE,
                AMClassAMCQuestionnaireByTEAIds
            );

            const componentAMCQuestions = this.getQuestionsFromProgramStage(
                programMetadata.programStages,
                AMR_GLASS_AMC_AM_COMPONENT_QUESTIONNAIRE_CODE,
                ComponentAMCQuestionnaireByTEAIds
            );

            return [...generalAMCQuestions, ...amClassAMCQuestions, ...componentAMCQuestions];
        });
    }

    private getQuestionsFromProgramStage(
        programStages: D2ProgramMetadata["programStages"],
        programStageCode: string,
        questionsByTEAIds: Record<string, AMCQuestionId>
    ): AMCQuestionnaireQuestions {
        const programStage = programStages.find(stage => stage.code === programStageCode);
        if (!programStage) {
            throw new Error(`Program stage ${programStageCode} not found`);
        }
        return programStage.programStageDataElements.reduce(
            (acc: AMCQuestionnaireQuestions, dataElement): AMCQuestionnaireQuestions => {
                const questionId = questionsByTEAIds[dataElement.dataElement.id];
                return questionId
                    ? [
                          ...acc,
                          {
                              text: dataElement.dataElement.displayFormName || "",
                              description: dataElement.dataElement.displayDescription || undefined,
                              id: questionId,
                          },
                      ]
                    : acc;
            },
            []
        );
    }
}
