import { AMClassAMCQuestionId } from "./AMClassAMCQuestionnaire";
import { GeneralAMCQuestionId } from "./GeneralAMCQuestionnaire";

// TODO: union type for id with other questionnaires
export type AMCQuestionId = GeneralAMCQuestionId | AMClassAMCQuestionId;

export type AMCQuestion = {
    text: string;
    id: AMCQuestionId;
};

export type AMCQuestionnaireQuestions = AMCQuestion[];
