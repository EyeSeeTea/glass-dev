import { Maybe } from "../../../../../../utils/ts-utils";
import { AMClassAMCQuestionnaireFormEntity, FormLables } from "../../presentation-entities/QuestionnaireFormEntity";
import { FormLoadState } from "../../../../form/presentation-entities/FormState";
import { useLoadAMCQuestionnaireForm, UseLoadAMCQuestionnaireFormParamsBase } from "./useLoadAMCQuestionnaireForm";

type State = {
    formLabels: Maybe<FormLables>;
    formState: FormLoadState;
    setFormState: (state: FormLoadState | ((prevState: FormLoadState) => FormLoadState)) => void;
    questionnaireFormEntity: Maybe<AMClassAMCQuestionnaireFormEntity>;
};

export function useLoadAMClassAMCQuestionnaireForm(params: UseLoadAMCQuestionnaireFormParamsBase): State {
    return useLoadAMCQuestionnaireForm({
        ...params,
        formType: "am-class-questionnaire",
        finderFunction: (amcQuestionnaire, id) =>
            amcQuestionnaire.amClassQuestionnaires.find(amClassQuestionnaire => amClassQuestionnaire.id === id),
    });
}
