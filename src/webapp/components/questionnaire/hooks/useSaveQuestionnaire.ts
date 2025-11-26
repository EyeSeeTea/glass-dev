import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { Question, QuestionnaireSelector } from "../../../../domain/entities/Questionnaire";
import { useAppContext } from "../../../contexts/app-context";
import { useBooleanState } from "../../../hooks/useBooleanState";
import { useCallback, useState } from "react";
import { useCallbackEffect } from "../../../hooks/useCallbackEffect";

export function useSaveQuestionnaire(questionnaire: QuestionnaireSelector) {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const [isSavingQuestionnaire, savingActions] = useBooleanState(false);
    const [questionsToSave, setQuestionsToSave] = useState<Question[]>([]);

    const saveQuestionnaire = useCallbackEffect(
        useCallback(
            (disableLoading?: boolean) => {
                if (disableLoading !== true) savingActions.enable();

                return compositionRoot.questionnaires.saveResponse(questionnaire, questionsToSave).run(
                    () => {
                        savingActions.disable();
                        setQuestionsToSave([]);
                        snackbar.success("Questionnaire saved successfully");
                    },
                    err => {
                        savingActions.disable();
                        console.error(err);
                        snackbar.error(err);
                    }
                );
            },
            [compositionRoot.questionnaires, questionnaire, questionsToSave, savingActions, snackbar]
        )
    );

    return {
        isSavingQuestionnaire: isSavingQuestionnaire,
        questionsToSave: questionsToSave,
        saveQuestionnaire: saveQuestionnaire,
        setQuestionsToSave: setQuestionsToSave,
    };
}
