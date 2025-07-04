import {
    useLoadAMCQuestionnaireForm,
    UseLoadAMCQuestionnaireFormParamsBase,
    UseLoadFormResult,
} from "./useLoadAMCQuestionnaireForm";

export function useLoadComponentAMCQuestionnaireForm(
    params: UseLoadAMCQuestionnaireFormParamsBase
): UseLoadFormResult<"component-questionnaire"> {
    return useLoadAMCQuestionnaireForm({
        ...params,
        formType: "component-questionnaire",
        finderFunction: (amcQuestionnaire, id) =>
            amcQuestionnaire.componentQuestionnaires.find(componentQuestionnaire => componentQuestionnaire.id === id),
    });
}
