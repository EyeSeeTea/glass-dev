import React from "react";
import { AMCQuestionnaireFormPage } from "./AMCQuestionnaireFormPage";
import { useCurrentPeriodContext } from "../../../contexts/current-period-context";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";

type QuestionnairesProps = {};

export const AMCQuestionnaires: React.FC<QuestionnairesProps> = () => {
    const { currentPeriod } = useCurrentPeriodContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();

    return (
        <div>
            <AMCQuestionnaireFormPage
                formType="general-questionnaire"
                id={undefined}
                orgUnitId={currentOrgUnitAccess.orgUnitId}
                period={currentPeriod}
            />
        </div>
    );
};
