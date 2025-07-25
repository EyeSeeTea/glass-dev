import { AMCQuestionnaire } from "../../../../../domain/entities/amc-questionnaires/AMCQuestionnaire";
import { Maybe } from "../../../../../types/utils";
import { AMCQuestionnaireOptionsContextState } from "../../../../contexts/amc-questionnaire-options-context";
import { FormState } from "../../../form/presentation-entities/FormState";
import { AMCQuestionnaireFormType } from "../presentation-entities/AMCQuestionnaireFormType";
import { QuestionnaireFormEntity, QuestionnaireFormEntityMap } from "../presentation-entities/QuestionnaireFormEntity";

export type MapToAMCQuestionnaireParams<T extends QuestionnaireFormEntity> = {
    formState: FormState;
    formEntity: T;
    orgUnitId: string;
    period: string;
    editMode: boolean;
    options: AMCQuestionnaireOptionsContextState;
};

export type MapToFormStateParams<T extends QuestionnaireFormEntity, ContextType extends object = object> = {
    questionnaireFormEntity: T;
    editMode: boolean;
    options: AMCQuestionnaireOptionsContextState;
    amcQuestionnaire: Maybe<AMCQuestionnaire>;
    isViewOnlyMode?: boolean;
    context?: ContextType;
};

export type MapToFormStateFunction<T extends QuestionnaireFormEntity, ContextType extends object = object> = (
    params: MapToFormStateParams<T, ContextType>
) => FormState;

export type AMCQuestionnaireFormMapper = {
    [key in AMCQuestionnaireFormType]: {
        mapFormStateToEntity: (
            params: MapToAMCQuestionnaireParams<QuestionnaireFormEntityMap[key]>
        ) => QuestionnaireFormEntityMap[key]["entity"];
        mapEntityToFormState: MapToFormStateFunction<QuestionnaireFormEntityMap[key]>;
    };
};
