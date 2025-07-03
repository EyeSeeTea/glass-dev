import { useSnackbar } from "@eyeseetea/d2-ui-components";
import React, { useEffect } from "react";
import styled from "styled-components";
import { CircularProgress } from "@material-ui/core";

import { Form } from "../../form/Form";
import { useAMCQuestionnaireContext } from "../../../contexts/amc-questionnaire-context";
import { FormFieldState } from "../../form/presentation-entities/FormFieldsState";
import { Maybe } from "../../../../types/utils";
import { FormLables } from "./presentation-entities/QuestionnaireFormEntity";
import { FormLoadState } from "../../form/presentation-entities/FormState";

type AMCQuestionnaireComponentProps = {
    formState: FormLoadState;
    handleFormChange: (updatedField: FormFieldState) => void;
    onSave: () => void;
    onCancel: () => void;
    formLabels: Maybe<FormLables>;
    showFormButtons?: boolean;
    isViewOnlyMode?: boolean;
};

export const AMCQuestionnaireComponent: React.FC<AMCQuestionnaireComponentProps> = React.memo(props => {
    const {
        formState,
        handleFormChange,
        onSave,
        onCancel,
        formLabels,
        isViewOnlyMode = false,
        showFormButtons = true,
    } = props;
    const { globalMessage } = useAMCQuestionnaireContext();

    const snackbar = useSnackbar();

    useEffect(() => {
        if (!globalMessage) return;

        snackbar[globalMessage.type](globalMessage.text);
    }, [globalMessage, snackbar]);

    return formState.kind === "loading" ? (
        <LoaderContainer>
            <CircularProgress />
        </LoaderContainer>
    ) : formState.kind === "loaded" ? (
        <Form
            formState={formState.data}
            onFormChange={handleFormChange}
            onSave={onSave}
            onCancel={onCancel}
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
