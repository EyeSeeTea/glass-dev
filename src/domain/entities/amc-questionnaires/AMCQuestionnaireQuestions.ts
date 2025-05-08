import { AMClassAMCQuestionId } from "./AMClassAMCQuestionnaire";
import { GeneralAMCQuestionId } from "./GeneralAMCQuestionnaire";

export type AMCQuestionId = GeneralAMCQuestionId | AMClassAMCQuestionId;

export type AMCQuestion = {
    text: string;
    id: AMCQuestionId;
};

export type AMCQuestionnaireQuestions = AMCQuestion[];
