import { useCallback, useEffect, useState } from "react";

import { updateFormState, FormState } from "./presentation-entities/FormState";
import { FormFieldState } from "./presentation-entities/FormFieldsState";

type State = {
    formLocalState: FormState;
    handleUpdateFormField: (updatedField: FormFieldState) => void;
};

export function useLocalForm(formState: FormState, onFormChange: (updatedField: FormFieldState) => void): State {
    const [formLocalState, setFormLocalState] = useState<FormState>(formState);

    useEffect(() => {
        setFormLocalState({
            ...formState,
        });
    }, [formState]);

    const handleUpdateFormField = useCallback(
        (updatedField: FormFieldState) => {
            setFormLocalState(prevState => updateFormState(prevState, updatedField));
            onFormChange(updatedField);
        },
        [onFormChange]
    );

    return {
        formLocalState,
        handleUpdateFormField,
    };
}
