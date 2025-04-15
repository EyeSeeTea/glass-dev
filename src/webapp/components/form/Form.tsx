import React from "react";
import styled from "styled-components";

import { useLocalForm } from "./useLocalForm";
import { FormState } from "./presentation-entities/FormState";
import { FormLayout } from "./FormLayout";
import { FormSection } from "./FormSection";
import { FormFieldState } from "./presentation-entities/FormFieldsState";

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
};

export const Form: React.FC<FormProps> = React.memo(props => {
    const { formState, onFormChange, onSave, onCancel, errorLabels } = props;
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
                disableSave={!formLocalState.isValid}
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
        </Container>
    );
});

const Container = styled.div``;
