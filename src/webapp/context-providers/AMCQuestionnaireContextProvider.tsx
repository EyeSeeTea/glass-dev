import { useEffect, useState } from "react";
import { useAppContext } from "../contexts/app-context";
import { AMCQuestionnaireContext, defaultAMCQuestionnaireContextState } from "../contexts/amc-questionnaire-context";
import { AMCQuestionnaire } from "../../domain/entities/amc-questionnaires/AMCQuestionnaire";
import { useCurrentPeriodContext } from "../contexts/current-period-context";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { Maybe } from "../../types/utils";

export const AMCQuestionnaireContextProvider: React.FC = ({ children }) => {
    const { compositionRoot } = useAppContext();
    const { currentPeriod } = useCurrentPeriodContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();

    const [amcQuestionnaire, setAMCQuestionnaire] = useState<Maybe<AMCQuestionnaire>>(
        defaultAMCQuestionnaireContextState.questionnaire
    );

    useEffect(() => {
        return compositionRoot.amcQuestionnaires
            .getByOrgUnitAndPeriod(currentOrgUnitAccess.orgUnitId, currentPeriod)
            .run(
                amcQuestionnaire => {
                    setAMCQuestionnaire(amcQuestionnaire);
                },
                error => {
                    console.error("Error fetching AMC Questionnaire:", error);
                    setAMCQuestionnaire(undefined);
                }
            );
    }, [compositionRoot.amcQuestionnaires, currentOrgUnitAccess.orgUnitId, currentPeriod]);

    return (
        <AMCQuestionnaireContext.Provider value={{ questionnaire: amcQuestionnaire }}>
            {children}
        </AMCQuestionnaireContext.Provider>
    );
};
