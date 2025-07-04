import {
    useLoadAMCQuestionnaireForm,
    UseLoadAMCQuestionnaireFormParamsBase,
    UseLoadFormResult,
} from "./useLoadAMCQuestionnaireForm";

export function useLoadAMClassAMCQuestionnaireForm(
    params: UseLoadAMCQuestionnaireFormParamsBase
): UseLoadFormResult<"am-class-questionnaire"> {
    return useLoadAMCQuestionnaireForm({
        ...params,
        formType: "am-class-questionnaire",
        finderFunction: (amcQuestionnaire, id) =>
            amcQuestionnaire.amClassQuestionnaires.find(amClassQuestionnaire => amClassQuestionnaire.id === id),
    });
}
