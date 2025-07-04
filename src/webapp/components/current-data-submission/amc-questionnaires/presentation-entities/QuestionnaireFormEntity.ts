import { GeneralAMCQuestionnaire } from "../../../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { AMClassAMCQuestionnaire } from "../../../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { Maybe } from "../../../../../utils/ts-utils";
import { AMCQuestionnaireFormType } from "./AMCQuestionnaireFormType";
import { FormRule } from "../../../form/presentation-entities/FormRule";
import { AMCQuestionnaireQuestions } from "../../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { getGeneralAMCQuestionnaireFormEntity } from "../getGeneralAMCQuestionnaireFormEntity";
import { getAMClassAMCQuestionnaireFormEntity } from "../getAMClassAMCQuestionnaireFormEntity";
import { ComponentAMCQuestionnaire } from "../../../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";
import { getComponentAMCQuestionnaireFormEntity } from "../getComponentAMCQuestionnaireFormEntity";

export type FormLables = {
    errors: Record<string, string>;
};

type BaseFormData = {
    labels: FormLables;
    rules: FormRule[];
    questions: AMCQuestionnaireQuestions;
    type: AMCQuestionnaireFormType;
};

export type AMCQuestionnaireMap = {
    "general-questionnaire": GeneralAMCQuestionnaire;
    "am-class-questionnaire": AMClassAMCQuestionnaire;
    "component-questionnaire": ComponentAMCQuestionnaire;
};

export type GeneralAMCQuestionnaireFormEntity = BaseFormData & {
    type: "general-questionnaire";
    entity: Maybe<GeneralAMCQuestionnaire>;
};

export type AMClassAMCQuestionnaireFormEntity = BaseFormData & {
    type: "am-class-questionnaire";
    entity: Maybe<AMClassAMCQuestionnaire>;
};

export type ComponentAMCQuestionnaireFormEntity = BaseFormData & {
    type: "component-questionnaire";
    entity: Maybe<ComponentAMCQuestionnaire>;
};

export type QuestionnaireFormEntityMap = {
    "general-questionnaire": GeneralAMCQuestionnaireFormEntity;
    "am-class-questionnaire": AMClassAMCQuestionnaireFormEntity;
    "component-questionnaire": ComponentAMCQuestionnaireFormEntity;
};

export type QuestionnaireFormEntity = QuestionnaireFormEntityMap[AMCQuestionnaireFormType];

type FormEntityGetterFunction<T extends AMCQuestionnaireFormType> = (
    amcQuestions: AMCQuestionnaireQuestions,
    entity?: Maybe<AMCQuestionnaireMap[T]>
) => Extract<QuestionnaireFormEntityMap[T], { type: T }>;

type FormEntityGetterMap = {
    [key in AMCQuestionnaireFormType]: FormEntityGetterFunction<key>;
};

const formEntityGetters: FormEntityGetterMap = {
    "general-questionnaire": getGeneralAMCQuestionnaireFormEntity,
    "am-class-questionnaire": getAMClassAMCQuestionnaireFormEntity,
    "component-questionnaire": getComponentAMCQuestionnaireFormEntity,
};

export function getQuestionnaireFormEntity<T extends AMCQuestionnaireFormType>(
    type: T,
    amcQuestions: AMCQuestionnaireQuestions,
    entity?: AMCQuestionnaireMap[T]
): Extract<QuestionnaireFormEntityMap[T], { type: T }> {
    return formEntityGetters[type](amcQuestions, entity);
}
