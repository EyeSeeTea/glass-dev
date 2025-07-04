import {
    useLoadAMCQuestionnaireForm,
    UseLoadAMCQuestionnaireFormParamsBase,
    UseLoadFormResult,
} from "./useLoadAMCQuestionnaireForm";

export function useLoadGeneralAMCQuestionnaireForm(
    params: UseLoadAMCQuestionnaireFormParamsBase
): UseLoadFormResult<"general-questionnaire"> {
    return useLoadAMCQuestionnaireForm({
        ...params,
        formType: "general-questionnaire",
        finderFunction: amcQuestionnaire => amcQuestionnaire.generalQuestionnaire,
    });
}
