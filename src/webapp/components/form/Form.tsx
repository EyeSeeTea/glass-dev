import React from "react";
import styled from "styled-components";
import { Button } from "@material-ui/core";

import { useLocalForm } from "./useLocalForm";
import { FormState } from "./presentation-entities/FormState";
import { FormLayout } from "./FormLayout";
import { FormSection } from "./FormSection";
import { FormFieldState } from "./presentation-entities/FormFieldsState";
import { SimpleModal } from "../simple-modal/SimpleModal";

export type ModalData = {
    title: string;
    content: string;
    cancelLabel: string;
    confirmLabel: string;
    onConfirm: () => void;
};

export type FormProps = {
    formState: FormState;
    errorLabels?: Record<string, string>;
    onFormChange: (updatedField: FormFieldState) => void;
    onSave: () => void;
    onCancel?: () => void;
    openModal?: boolean;
    modalData?: ModalData;
    setOpenModal?: (show: boolean) => void;
    isViewOnlyMode?: boolean;
    showFormButtons?: boolean;
};

export const Form: React.FC<FormProps> = React.memo(props => {
    const {
        formState,
        onFormChange,
        onSave,
        onCancel,
        errorLabels,
        openModal = false,
        modalData,
        setOpenModal,
        isViewOnlyMode = false,
        showFormButtons = true,
    } = props;
    const { formLocalState, handleUpdateFormField } = useLocalForm(formState, onFormChange);

    return (
        <Container>
            <FormLayout
                title={formLocalState.title}
                subtitle={formLocalState.subtitle}
                onSave={onSave}
                onCancel={onCancel}
                saveLabel={formLocalState.saveButtonLabel}
                cancelLabel={formLocalState.cancelButtonLabel}
                disableSave={!formLocalState.isValid || isViewOnlyMode}
                showFormButtons={showFormButtons}
            >
                {formLocalState.sections.map(section => {
                    if (!section.isVisible) return null;

                    return (
                        <FormSection
                            key={section.id}
                            id={section.id}
                            title={section.title}
                            required={section.required}
                            fields={section.fields}
                            onUpdateField={handleUpdateFormField}
                            errorLabels={errorLabels}
                        />
                    );
                })}
            </FormLayout>
            {modalData && setOpenModal ? (
                <SimpleModal
                    open={openModal}
                    onClose={() => setOpenModal(false)}
                    title={modalData.title}
                    closeLabel={modalData.cancelLabel}
                    footerButtons={<Button onClick={modalData.onConfirm}>{modalData.confirmLabel}</Button>}
                >
                    {openModal && <Text>{modalData.content}</Text>}
                </SimpleModal>
            ) : null}
        </Container>
    );
});

const Container = styled.div``;

const Text = styled.div`
    font-weight: 400;
    font-size: 0.875rem;
`;
