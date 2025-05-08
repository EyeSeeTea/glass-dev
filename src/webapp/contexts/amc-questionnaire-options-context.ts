import { createContext, useContext } from "react";
import { YesNoOption } from "../../domain/entities/amc-questionnaires/YesNoOption";
import { YesNoUnknownNAOption } from "../../domain/entities/amc-questionnaires/YesNoUnknownNAOption";
import { YesNoUnknownOption } from "../../domain/entities/amc-questionnaires/YesNoUnknownOption";

export interface AMCQuestionnaireOptionsContextState {
    yesNoUnknownNAOptions: YesNoUnknownNAOption[];
    yesNoOptions: YesNoOption[];
    yesNoUnknownOptions: YesNoUnknownOption[];
}

export const defaultAMCQuestionnaireOptionsContextState = {
    yesNoUnknownNAOptions: [],
    yesNoOptions: [],
    yesNoUnknownOptions: [],
};

export const AMCQuestionnaireOptionsContext = createContext<AMCQuestionnaireOptionsContextState>(
    defaultAMCQuestionnaireOptionsContextState
);

export function useAMCQuestionnaireOptionsContext() {
    const context = useContext(AMCQuestionnaireOptionsContext);

    if (context) {
        return context;
    } else {
        throw new Error("AMC Questionnaire Options Context uninitialized");
    }
}
