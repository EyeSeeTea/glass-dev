import { FutureData } from "../../../domain/entities/Future";
import { D2Api } from "../../../types/d2-api";
import { QuestionsAMCQuestionnaireRepository } from "../../../domain/repositories/amc-questionnaires/QuestionsAMCQuestionnaireRepository";
import { AMCQuestionnaireQuestions } from "../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { generalAMCQuestionnaireByTEAIds } from "./AMCQuestionnaireConstants";
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

            // TODO: get questions from program stages data elements and merge with the below
            return generalAMCQuestions;
        });
    }
}
