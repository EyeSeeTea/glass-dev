import { useSnackbar } from "@eyeseetea/d2-ui-components";
import React, { useEffect } from "react";
import { useAMCQuestionnaireContext } from "../../../../contexts/amc-questionnaire-context";
import { AMCQuestionnaireComponent } from "../AMCQuestionnaireComponent";
import { useChangeAMCQuestionnaireForm } from "../hooks/useChangeAMCQuestionnaireForm";
import { AMCQuestionnaireFormPageProps } from "./AMCQuestionnaireFormPageProps";
import { useLoadAMCQuestionnaireForm } from "../hooks/useLoadAMCQuestionnaireForm";
import { useSaveAMCQuestionnaireForm } from "../hooks/useSaveAMCQuestionnaireForm";
import { Future } from "../../../../../domain/entities/Future";
import { useAppContext } from "../../../../contexts/app-context";

export const AMClassAMCQuestionnaireFormPage: React.FC<AMCQuestionnaireFormPageProps> = React.memo(props => {
    const { id, orgUnitId, period, onSave, onCancel, isViewOnlyMode = false, showFormButtons = true } = props;
    const { globalMessage } = useAMCQuestionnaireContext();
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const { formLabels, formState, setFormState, questionnaireFormEntity } = useLoadAMCQuestionnaireForm({
        id,
        orgUnitId,
        period,
        isViewOnlyMode,
        formType: "am-class-questionnaire",
        finderFunction: (amcQuestionnaire, id) =>
            amcQuestionnaire.amClassQuestionnaires.find(amClassQuestionnaire => amClassQuestionnaire.id === id),
    });

    const { save, isLoading: isSaveLoading } = useSaveAMCQuestionnaireForm({
        formType: "am-class-questionnaire",
        saveFunction: (rootQuestionnaire, questionnaire) => {
            if (!questionnaire) {
                return Future.error("AM Class Questionnaire is undefined");
            }
            return compositionRoot.amcQuestionnaires.saveAmClass(rootQuestionnaire, questionnaire);
        },
    });

    const { handleFormChange } = useChangeAMCQuestionnaireForm({
        questionnaireFormEntity,
        setFormState,
    });

    useEffect(() => {
        if (!globalMessage) return;

        snackbar[globalMessage.type](globalMessage.text);
    }, [globalMessage, snackbar]);

    return (
        <AMCQuestionnaireComponent
            formState={isSaveLoading ? { kind: "loading" } : formState}
            handleFormChange={handleFormChange}
            onSave={() =>
                questionnaireFormEntity &&
                save({
                    orgUnitId,
                    period,
                    id: id,
                    questionnaireFormEntity: questionnaireFormEntity,
                    formState: formState,
                    onSave: onSave,
                })
            }
            onCancel={() => (onCancel ? onCancel() : undefined)}
            formLabels={formLabels}
            isViewOnlyMode={isViewOnlyMode}
            showFormButtons={showFormButtons}
        />
    );
});
