import { useSnackbar } from "@eyeseetea/d2-ui-components";
import React, { useEffect } from "react";
import { useAMCQuestionnaireContext } from "../../../../contexts/amc-questionnaire-context";
import { AMCQuestionnaireComponent } from "../AMCQuestionnaireComponent";
import { useChangeAMCQuestionnaireForm } from "../hooks/useChangeAMCQuestionnaireForm";
import { AMCQuestionnaireFormPageProps } from "./AMCQuestionnaireFormPageProps";
import { useLoadAMClassAMCQuestionnaireForm } from "../hooks/useLoad/useLoadAMClassAMCQuestionnaireForm";
import { useSaveAMClassAMCQuestionnaireForm } from "../hooks/useSave/useSaveAMClassAMCQuestionnaireForm";

export const AMClassAMCQuestionnaireFormPage: React.FC<AMCQuestionnaireFormPageProps> = React.memo(props => {
    const { id, orgUnitId, period, onSave, onCancel, isViewOnlyMode = false, showFormButtons = true } = props;
    const { globalMessage } = useAMCQuestionnaireContext();

    const snackbar = useSnackbar();
    const { formLabels, formState, setFormState, questionnaireFormEntity } = useLoadAMClassAMCQuestionnaireForm({
        id,
        orgUnitId,
        period,
        isViewOnlyMode,
    });
    const { save, isLoading: isSaveLoading } = useSaveAMClassAMCQuestionnaireForm();
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
