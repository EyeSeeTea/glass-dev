import { AMClassAMCQuestionId } from "./AMClassAMCQuestionnaire";
import { ComponentAMCQuestionId } from "./ComponentAMCQuestionnaire";
import { GeneralAMCQuestionId } from "./GeneralAMCQuestionnaire";

export type AMCQuestionId = GeneralAMCQuestionId | AMClassAMCQuestionId | ComponentAMCQuestionId;

export type AMCQuestion = {
    text: string;
    description?: string;
    id: AMCQuestionId;
};

export type AMCQuestionnaireQuestions = AMCQuestion[];
