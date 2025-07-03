import { Future } from "../../../../../../domain/entities/Future";
import { useAppContext } from "../../../../../contexts/app-context";
import { amcQuestionnaireMappers } from "../../mappers";
import { useSaveAMCQuestionnaireForm } from "./useSaveAMCQuestionnaireForm";

export function useSaveGeneralAMCQuestionnaireForm() {
    const { compositionRoot } = useAppContext();
    const mapper = amcQuestionnaireMappers["general-questionnaire"];

    return useSaveAMCQuestionnaireForm({
        formType: "general-questionnaire",
        mapper,
        saveFunction: (_rootQuestionnaire, questionnaire) => {
            if (!questionnaire) {
                return Future.error("Questionnaire entity is undefined");
            }
            return compositionRoot.amcQuestionnaires.saveGeneral(questionnaire);
        },
    });
}
