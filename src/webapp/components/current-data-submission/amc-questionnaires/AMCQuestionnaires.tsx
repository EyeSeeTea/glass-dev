import React from "react";

import { AMCQuestionnaireOptionsContextProvider } from "../../../context-providers/AMCQuestionnaireOptionsContextProvider";
import { AMCQuestionnaireContextProvider } from "../../../context-providers/AMCQuestionnaireContextProvider";
import { MainPageAMCQuestionnaires } from "./MainPageAMCQuestionnaires";

export const AMCQuestionnaires: React.FC = () => {
    return (
        <AMCQuestionnaireOptionsContextProvider>
            <AMCQuestionnaireContextProvider>
                <MainPageAMCQuestionnaires />
            </AMCQuestionnaireContextProvider>
        </AMCQuestionnaireOptionsContextProvider>
    );
};
