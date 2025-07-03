import { Future } from "../../../../../../domain/entities/Future";
import { useAppContext } from "../../../../../contexts/app-context";
import { amcQuestionnaireMappers } from "../../mappers";
import { useSaveAMCQuestionnaireForm } from "./useSaveAMCQuestionnaireForm";

export function useSaveComponentAMCQuestionnaireForm() {
    const { compositionRoot } = useAppContext();
    const mapper = amcQuestionnaireMappers["component-questionnaire"];

    return useSaveAMCQuestionnaireForm({
        formType: "component-questionnaire",
        mapper,
        saveFunction: (rootQuestionnaire, questionnaire) => {
            if (!questionnaire) {
                return Future.error("Component Questionnaire is undefined");
            }
            return compositionRoot.amcQuestionnaires.saveComponent(rootQuestionnaire, questionnaire);
        },
    });
}
