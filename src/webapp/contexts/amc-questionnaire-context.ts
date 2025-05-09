import { createContext, useContext } from "react";
import { AMCQuestionnaire } from "../../domain/entities/amc-questionnaires/AMCQuestionnaire";
import { Maybe } from "../../types/utils";

export interface AMCQuestionnaireContextState {
    questionnaire: Maybe<AMCQuestionnaire>;
}

export const defaultAMCQuestionnaireContextState: AMCQuestionnaireContextState = {
    questionnaire: undefined,
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
