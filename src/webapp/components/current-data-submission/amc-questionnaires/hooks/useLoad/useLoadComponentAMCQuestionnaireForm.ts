import { Maybe } from "../../../../../../utils/ts-utils";
import { ComponentAMCQuestionnaireFormEntity, FormLables } from "../../presentation-entities/QuestionnaireFormEntity";
import { FormLoadState } from "../../../../form/presentation-entities/FormState";
import { useLoadAMCQuestionnaireForm, UseLoadAMCQuestionnaireFormParamsBase } from "./useLoadAMCQuestionnaireForm";

type State = {
    formLabels: Maybe<FormLables>;
    formState: FormLoadState;
    setFormState: (state: FormLoadState | ((prevState: FormLoadState) => FormLoadState)) => void;
    questionnaireFormEntity: Maybe<ComponentAMCQuestionnaireFormEntity>;
};

export function useLoadComponentAMCQuestionnaireForm(params: UseLoadAMCQuestionnaireFormParamsBase): State {
    return useLoadAMCQuestionnaireForm({
        ...params,
        formType: "component-questionnaire",
        finderFunction: (amcQuestionnaire, id) =>
            amcQuestionnaire.componentQuestionnaires.find(componentQuestionnaire => componentQuestionnaire.id === id),
    });
}
