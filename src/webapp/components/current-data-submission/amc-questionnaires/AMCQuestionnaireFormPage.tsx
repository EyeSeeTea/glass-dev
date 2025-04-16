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
};

export const AMCQuestionnaireFormPage: React.FC<AMCQuestionnaireFormPageProps> = React.memo(props => {
    const { formType, id, orgUnitId, period } = props;

    const snackbar = useSnackbar();
    const { formLabels, globalMessage, formState, isLoading, handleFormChange, onPrimaryButtonClick, onCancelForm } =
        useAMCQuestionnaireForm({ formType, id, orgUnitId, period });

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
            onSave={onPrimaryButtonClick}
            onCancel={onCancelForm}
            errorLabels={formLabels?.errors}
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
