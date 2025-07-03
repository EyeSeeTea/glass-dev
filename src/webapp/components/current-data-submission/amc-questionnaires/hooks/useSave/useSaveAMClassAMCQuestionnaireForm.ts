import { Future } from "../../../../../../domain/entities/Future";
import { useAppContext } from "../../../../../contexts/app-context";
import { amcQuestionnaireMappers } from "../../mappers";
import { useSaveAMCQuestionnaireForm } from "./useSaveAMCQuestionnaireForm";

export function useSaveAMClassAMCQuestionnaireForm() {
    const { compositionRoot } = useAppContext();
    const mapper = amcQuestionnaireMappers["am-class-questionnaire"];

    return useSaveAMCQuestionnaireForm({
        formType: "am-class-questionnaire",
        mapper,
        saveFunction: (rootQuestionnaire, questionnaire) => {
            if (!questionnaire) {
                return Future.error("AM Class Questionnaire is undefined");
            }
            return compositionRoot.amcQuestionnaires.saveAmClass(rootQuestionnaire, questionnaire);
        },
    });
}
