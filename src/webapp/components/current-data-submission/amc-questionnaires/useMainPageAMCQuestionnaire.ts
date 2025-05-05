import { useCallback, useEffect, useState } from "react";
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

type MainPageAMCQuestionnaireState = {
    globalMessage?: GlobalMessage;
    isLoading: boolean;
    generalAMCQuestionnaire?: GeneralAMCQuestionnaire;
    isEditMode: boolean;
    generalAMCQuestionnaireId: Maybe<Id>;
    onClickAddOrEdit: () => void;
    onCancelForm: () => void;
    onSaveForm: () => void;
};

export function useMainPageAMCQuestionnaire(): MainPageAMCQuestionnaireState {
    const { compositionRoot } = useAppContext();
    const { currentPeriod } = useCurrentPeriodContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();

    const [globalMessage, setGlobalMessage] = useState<Maybe<GlobalMessage>>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [generalAMCQuestionnaireId, setGeneralAMCQuestionnaireId] = useState<Id | undefined>(undefined);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        compositionRoot.amcQuestionnaires
            .getGeneralByOrgUnitAndPeriod(currentOrgUnitAccess.orgUnitId, currentPeriod)
            .run(
                generalAMCQuestionnaireResponse => {
                    setGeneralAMCQuestionnaireId(generalAMCQuestionnaireResponse?.id);
                    setIsLoading(false);
                },
                error => {
                    console.debug(error);
                    setGlobalMessage({
                        type: "error",
                        text: `Error loading General AMC Questionnaire: ${error}`,
                    });
                    setIsLoading(false);
                }
            );
    }, [compositionRoot.amcQuestionnaires, currentOrgUnitAccess.orgUnitId, currentPeriod]);

    const onClickAddOrEdit = useCallback(() => setIsEditMode(true), []);

    const onCancelEditMode = useCallback(() => setIsEditMode(false), []);

    return {
        globalMessage,
        isLoading,
        generalAMCQuestionnaireId,
        isEditMode,
        onClickAddOrEdit,
        onCancelForm: onCancelEditMode,
        onSaveForm: onCancelEditMode,
    };
}
