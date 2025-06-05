import { useSnackbar } from "@eyeseetea/d2-ui-components";
import React, { useEffect } from "react";
import styled from "styled-components";
import { CircularProgress } from "@material-ui/core";

import { Id } from "../../../../domain/entities/Base";
import { useAMCQuestionnaireForm } from "./hooks/useAMCQuestionnaireForm";
import { Form } from "../../form/Form";
import { AMCQuestionnaireFormType } from "./presentation-entities/AMCQuestionnaireFormType";
import { useAMCQuestionnaireContext } from "../../../contexts/amc-questionnaire-context";
import { useSaveAMCQuestionnaireForm } from "./hooks/useSaveAMCQuestionnaireForm";

type AMCQuestionnaireFormPageProps = {
    formType: AMCQuestionnaireFormType;
    id?: Id;
    orgUnitId: Id;
    period: string;
    onSave?: () => void;
    onCancel?: () => void;
    isViewOnlyMode?: boolean;
    showFormButtons?: boolean;
};

export const AMCQuestionnaireFormPage: React.FC<AMCQuestionnaireFormPageProps> = React.memo(props => {
    const { formType, id, orgUnitId, period, onSave, onCancel, isViewOnlyMode = false, showFormButtons = true } = props;
    const { globalMessage } = useAMCQuestionnaireContext();

    const snackbar = useSnackbar();
    const { formLabels, formState, handleFormChange, onCancelForm, questionnaireFormEntity } = useAMCQuestionnaireForm({
        formType: formType,
        id: id,
        orgUnitId: orgUnitId,
        period: period,
        isViewOnlyMode: isViewOnlyMode,
        onCancel: onCancel,
    });

    const { save, isLoading: isSaveLoading } = useSaveAMCQuestionnaireForm({
        formType: formType,
    });

    useEffect(() => {
        if (!globalMessage) return;

        snackbar[globalMessage.type](globalMessage.text);
    }, [globalMessage, snackbar]);

    return formState.kind === "loading" || isSaveLoading ? (
        <LoaderContainer>
            <CircularProgress />
        </LoaderContainer>
    ) : formState.kind === "loaded" ? (
        <Form
            formState={formState.data}
            onFormChange={handleFormChange}
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
            onCancel={onCancelForm}
            errorLabels={formLabels?.errors}
            isViewOnlyMode={isViewOnlyMode}
            showFormButtons={showFormButtons}
        />
    ) : formState.message ? (
        <ErrorMessageContainer>{formState.message}</ErrorMessageContainer>
    ) : null;
});

const ErrorMessageContainer = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
`;

const LoaderContainer = styled.div``;
