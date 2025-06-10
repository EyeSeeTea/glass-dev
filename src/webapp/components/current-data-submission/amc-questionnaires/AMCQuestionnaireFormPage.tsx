import { useSnackbar } from "@eyeseetea/d2-ui-components";
import React, { useEffect } from "react";
import styled from "styled-components";
import { CircularProgress } from "@material-ui/core";

import { Id } from "../../../../domain/entities/Base";
import { useAMCQuestionnaireForm } from "./useAMCQuestionnaireForm";
import { Form } from "../../form/Form";
import { AMCQuestionnaireFormType } from "./presentation-entities/AMCQuestionnaireFormType";

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

    const snackbar = useSnackbar();
    const { formLabels, globalMessage, formState, isLoading, handleFormChange, onClickSave, onCancelForm } =
        useAMCQuestionnaireForm({
            formType: formType,
            id: id,
            orgUnitId: orgUnitId,
            period: period,
            isViewOnlyMode: isViewOnlyMode,
            onSave: onSave,
            onCancel: onCancel,
        });

    useEffect(() => {
        if (!globalMessage) return;

        snackbar[globalMessage.type](globalMessage.text);
    }, [globalMessage, snackbar]);

    return formState.kind === "loading" || isLoading ? (
        <LoaderContainer>
            <CircularProgress />
        </LoaderContainer>
    ) : formState.kind === "loaded" ? (
        <Form
            formState={formState.data}
            onFormChange={handleFormChange}
            onSave={onClickSave}
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
