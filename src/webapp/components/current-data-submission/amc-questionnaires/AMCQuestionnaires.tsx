import React from "react";
import { AMCQuestionnaireFormPage } from "./AMCQuestionnaireFormPage";
import { useCurrentPeriodContext } from "../../../contexts/current-period-context";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { AMCQuestionnaireOptionsContextProvider } from "../../../context-providers/AMCQuestionnaireOptionsContextProvider";
import { AMCQuestionnaireContextProvider } from "../../../context-providers/AMCQuestionnaireContextProvider";

type QuestionnairesProps = {};

export const AMCQuestionnaires: React.FC<QuestionnairesProps> = () => {
    const { currentPeriod } = useCurrentPeriodContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();

    return (
        <AMCQuestionnaireOptionsContextProvider>
            <AMCQuestionnaireContextProvider>
                <div>
                    <AMCQuestionnaireFormPage
                        formType="general-questionnaire"
                        id={undefined}
                        orgUnitId={currentOrgUnitAccess.orgUnitId}
                        period={currentPeriod}
                    />
                    <AMCQuestionnaireFormPage
                        formType="am-class-questionnaire"
                        id={undefined}
                        orgUnitId={currentOrgUnitAccess.orgUnitId}
                        period={currentPeriod}
                    />
                </div>
            </AMCQuestionnaireContextProvider>
        </AMCQuestionnaireOptionsContextProvider>
    );
};
