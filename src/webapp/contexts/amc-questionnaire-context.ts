import { createContext, useContext } from "react";
import { AMCQuestionnaire } from "../../domain/entities/amc-questionnaires/AMCQuestionnaire";

export interface AMCQuestionnaireContextState {
    questionnaire: AMCQuestionnaire | null;
}

export const defaultAMCQuestionnaireContextState: AMCQuestionnaireContextState = {
    questionnaire: null,
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
