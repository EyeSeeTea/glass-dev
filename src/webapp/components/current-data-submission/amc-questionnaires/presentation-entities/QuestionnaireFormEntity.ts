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

export function getQuestionnaireFormEntity<T extends AMCQuestionnaireFormType>(
    type: T,
    amcQuestions: AMCQuestionnaireQuestions,
    entity?: QuestionnaireFormEntityMap[T]["entity"]
): QuestionnaireFormEntityMap[T] {
    switch (type) {
        case "general-questionnaire":
            return getGeneralAMCQuestionnaireFormEntity(
                amcQuestions,
                entity as Maybe<GeneralAMCQuestionnaire>
            ) as QuestionnaireFormEntityMap[T];
        case "am-class-questionnaire":
            return getAMClassAMCQuestionnaireFormEntity(
                amcQuestions,
                entity as Maybe<AMClassAMCQuestionnaire>
            ) as QuestionnaireFormEntityMap[T];
        case "component-questionnaire":
            return getComponentAMCQuestionnaireFormEntity(
                amcQuestions,
                entity as Maybe<ComponentAMCQuestionnaire>
            ) as QuestionnaireFormEntityMap[T];
        default:
            throw new Error(`Unsupported questionnaire type: ${type}`);
    }
}
