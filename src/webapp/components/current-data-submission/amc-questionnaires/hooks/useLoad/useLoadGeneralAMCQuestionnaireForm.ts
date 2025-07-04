import { Maybe } from "../../../../../../utils/ts-utils";
import { FormLables, GeneralAMCQuestionnaireFormEntity } from "../../presentation-entities/QuestionnaireFormEntity";
import { FormLoadState } from "../../../../form/presentation-entities/FormState";
import { useLoadAMCQuestionnaireForm, UseLoadAMCQuestionnaireFormParamsBase } from "./useLoadAMCQuestionnaireForm";

type State = {
    formLabels: Maybe<FormLables>;
    formState: FormLoadState;
    setFormState: (state: FormLoadState | ((prevState: FormLoadState) => FormLoadState)) => void;
    questionnaireFormEntity: Maybe<GeneralAMCQuestionnaireFormEntity>;
};

export function useLoadGeneralAMCQuestionnaireForm(params: UseLoadAMCQuestionnaireFormParamsBase): State {
    return useLoadAMCQuestionnaireForm({
        ...params,
        formType: "general-questionnaire",
        finderFunction: amcQuestionnaire => amcQuestionnaire.generalQuestionnaire,
    });
}
