import { createContext, useContext } from "react";
import { AMCQuestionnaire } from "../../domain/entities/amc-questionnaires/AMCQuestionnaire";
import { Maybe } from "../../types/utils";
import { AMCQuestionnaireQuestions } from "../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { Cancel } from "../../domain/entities/Future";

export type GlobalMessage = {
    text: string;
    type: "warning" | "success" | "error";
};

export interface AMCQuestionnaireContextState {
    fetchQuestionnaire: () => Cancel;
    questionnaire: Maybe<AMCQuestionnaire>;
    questionnaireIsLoading: boolean;
    questionnaireError: Maybe<Error>;
    questions: Maybe<AMCQuestionnaireQuestions>;
    globalMessage: Maybe<GlobalMessage>;
    setGlobalMessage: (message: Maybe<GlobalMessage>) => void;
}

export const defaultAMCQuestionnaireContextState: AMCQuestionnaireContextState = {
    fetchQuestionnaire: () => () => {},
    questionnaire: undefined,
    questionnaireIsLoading: false,
    questionnaireError: undefined,
    questions: undefined,
    globalMessage: undefined,
    setGlobalMessage: () => {},
};

export const AMCQuestionnaireContext = createContext<AMCQuestionnaireContextState>(defaultAMCQuestionnaireContextState);

export function useAMCQuestionnaireContext() {
    const context = useContext(AMCQuestionnaireContext);

    if (context) {
        return context;
    } else {
        throw new Error("AMC Questionnaire Context uninitialized");
    }
}
