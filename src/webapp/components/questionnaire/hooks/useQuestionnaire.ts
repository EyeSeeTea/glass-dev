import React, { useState } from "react";
import { Question, Questionnaire, QuestionnarieM } from "../../../../domain/entities/Questionnaire";
import { useCallbackEffect } from "../../../hooks/useCallbackEffect";
import { useGlassCaptureAccess } from "../../../hooks/useGlassCaptureAccess";
import { useBooleanState } from "../../../hooks/useBooleanState";
import { useAppContext } from "../../../contexts/app-context";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { useGlassModule } from "../../../hooks/useGlassModule";
import { QuestionnarieFormProps } from "../QuestionnaireForm";

export function useQuestionnaire(options: QuestionnarieFormProps) {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const module = useGlassModule();
    const [isSaving, savingActions] = useBooleanState(false);

    const { onSave, id, orgUnitId, year } = options;
    const selector = React.useMemo(() => ({ id, orgUnitId, year }), [id, orgUnitId, year]);
    const [questionnaire, setQuestionnaire] = useState<Questionnaire>();
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess() ? true : false;

    React.useEffect(() => {
        if (module.kind !== "loaded") return;
        return compositionRoot.questionnaires
            .get(module.data, selector, hasCurrentUserCaptureAccess)
            .run(setQuestionnaire, err => snackbar.error(err));
    }, [compositionRoot, snackbar, selector, module, hasCurrentUserCaptureAccess]);

    React.useEffect(() => {
        if (questionnaire) onSave(questionnaire);
    }, [questionnaire, onSave]);

    const setAsCompleted = useCallbackEffect(
        React.useCallback(
            (isCompleted: boolean, options: { onSuccess: () => void }) => {
                savingActions.enable();

                return compositionRoot.questionnaires.setAsCompleted(selector, isCompleted).run(
                    () => {
                        savingActions.disable();
                        options.onSuccess();
                        setQuestionnaire(questionnaire => {
                            return questionnaire ? QuestionnarieM.setAsComplete(questionnaire, isCompleted) : undefined;
                        });
                    },
                    err => {
                        savingActions.disable();
                        snackbar.error(err);
                    }
                );
            },
            [compositionRoot, snackbar, selector, savingActions]
        )
    );

    const setQuestion = React.useCallback((newQuestion: Question) => {
        setQuestionnaire(questionnaire => {
            return questionnaire ? QuestionnarieM.updateQuestion(questionnaire, newQuestion) : undefined;
        });
    }, []);

    const actions = { setAsCompleted, setQuestion };

    return [questionnaire, selector, actions, isSaving] as const;
}
