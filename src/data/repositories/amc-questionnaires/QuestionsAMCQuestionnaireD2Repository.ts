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
                                  text: attribute.trackedEntityAttribute.displayDescription || "",
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

            // TODO: get questions from program stages data elements and merge with the below
            return [...generalAMCQuestions, ...amClassAMCQuestions];
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
                              id: questionId,
                          },
                      ]
                    : acc;
            },
            []
        );
    }
}
