import { useSnackbar } from "@eyeseetea/d2-ui-components";
import React, { useEffect } from "react";
import { useAMCQuestionnaireContext } from "../../../../contexts/amc-questionnaire-context";
import { useSaveAMCQuestionnaireForm } from "../hooks/useSaveAMCQuestionnaireForm";
import { AMCQuestionnaireComponent } from "../AMCQuestionnaireComponent";
import { useLoadAMCQuestionnaireForm } from "../hooks/useLoadAMCQuestionnaireForm";
import { useChangeAMCQuestionnaireForm } from "../hooks/useChangeAMCQuestionnaireForm";
import { AMCQuestionnaireFormPageProps } from "./AMCQuestionnaireFormPageProps";

export const GeneralAMCQuestionnaireFormPage: React.FC<AMCQuestionnaireFormPageProps> = React.memo(props => {
    const { id, orgUnitId, period, onSave, onCancel, isViewOnlyMode = false, showFormButtons = true } = props;
    const { globalMessage } = useAMCQuestionnaireContext();

    const snackbar = useSnackbar();
    const { formLabels, formState, setFormState, questionnaireFormEntity } = useLoadAMCQuestionnaireForm({
        formType: "general-questionnaire",
        id,
        orgUnitId,
        period,
        isViewOnlyMode,
    });
    const { save, isLoading: isSaveLoading } = useSaveAMCQuestionnaireForm({
        formType: "general-questionnaire",
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
