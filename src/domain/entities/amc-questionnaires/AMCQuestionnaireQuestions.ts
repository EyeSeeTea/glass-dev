import { GeneralAMCQuestionId } from "./GeneralAMCQuestionnaire";

// TODO: union type for id with other questionnaires
export type AMCQuestion = {
    text: string;
    id: GeneralAMCQuestionId;
};

export type AMCQuestionnaireQuestions = AMCQuestion[];
