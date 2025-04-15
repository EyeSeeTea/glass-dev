import { useEffect, useState } from "react";
import { Id } from "../../../../domain/entities/Ref";
import { GeneralAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { useAppContext } from "../../../contexts/app-context";
import { Maybe } from "../../../../utils/ts-utils";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { useCurrentPeriodContext } from "../../../contexts/current-period-context";

type GlobalMessage = {
    text: string;
    type: "warning" | "success" | "error";
};

type GeneralAMCQuestionnaireState = {
    globalMessage?: GlobalMessage;
    generalAMCQuestionnaire?: GeneralAMCQuestionnaire;
};

export function useGeneralAMCQuestionnaire(id: Id): GeneralAMCQuestionnaireState {
    const { compositionRoot } = useAppContext();
    const { currentPeriod } = useCurrentPeriodContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();

    const [globalMessage, setGlobalMessage] = useState<Maybe<GlobalMessage>>(undefined);
    const [generalAMCQuestionnaire, setGeneralAMCQuestionnaire] = useState<GeneralAMCQuestionnaire | undefined>(
        undefined
    );

    useEffect(() => {
        compositionRoot.amcQuestionnaires.getGeneral(id, currentOrgUnitAccess.orgUnitId, currentPeriod).run(
            generalAMCQuestionnaireResponse => {
                setGeneralAMCQuestionnaire(generalAMCQuestionnaireResponse);
                setGlobalMessage({
                    type: "success",
                    text: `General AMC Questionnaire loaded successfully`,
                });
            },
            error => {
                console.debug(error);
                setGlobalMessage({
                    type: "error",
                    text: `Error loading General AMC Questionnaire: ${error}`,
                });
            }
        );
    }, [compositionRoot.amcQuestionnaires, currentOrgUnitAccess.orgUnitId, currentPeriod, id]);

    return {
        globalMessage,
        generalAMCQuestionnaire,
    };
}
