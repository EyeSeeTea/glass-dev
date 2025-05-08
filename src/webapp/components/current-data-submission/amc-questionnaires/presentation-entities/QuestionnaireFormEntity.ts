import { GeneralAMCQuestionnaire } from "../../../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { Maybe } from "../../../../../utils/ts-utils";
import { AMCQuestionnaireFormType } from "./AMCQuestionnaireFormType";
import { FormRule } from "../../../form/presentation-entities/FormRule";
import { AMCQuestionnaireQuestions } from "../../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { getGeneralAMCQuestionnaireFormEntity } from "../getGeneralAMCQuestionnaireFormEntity";

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

export type QuestionnaireFormEntity = GeneralAMCQuestionnaireFormEntity;

export function getQuestionnaireFormEntity(
    type: QuestionnaireFormEntity["type"],
    amcQuestions: AMCQuestionnaireQuestions,
    entity?: QuestionnaireFormEntity["entity"]
): QuestionnaireFormEntity {
    // TODO: when more questionnaire types are added, add them here with switch case
    return getGeneralAMCQuestionnaireFormEntity(amcQuestions, entity);
}
