import React, { useCallback } from "react";

import { FormFieldState, updateFieldState } from "./presentation-entities/FormFieldsState";
import { MultipleSelector } from "./widgets/MultipleSelector";
import { Selector } from "./widgets/Selector";
import { RadioButtonsGroup } from "./widgets/RadioButtonsGroup";
import { TextArea } from "./widgets/TextArea";
import { TextInput } from "./widgets/TextInput";
import { Checkbox } from "./widgets/Checkbox";
import { CheckboxesGroup } from "./widgets/CheckboxesGroup";

export type FieldWidgetProps = {
    onChange: (updatedField: FormFieldState) => void;
    field: FormFieldState;
    disabled?: boolean;
    errorLabels?: Record<string, string>;
};

export const FieldWidget: React.FC<FieldWidgetProps> = React.memo((props): JSX.Element => {
    const { field, onChange, disabled = false, errorLabels } = props;

    const notifyChange = useCallback(
        (newValue: FormFieldState["value"]) => {
            onChange(updateFieldState(field, newValue));
        },
        [field, onChange]
    );

    const commonProps = {
        id: field.id,
        label: field.label,
        onChange: notifyChange,
        helperText: field.helperText,
        errorText: field.errors
            ? field.errors.map(error => (errorLabels && errorLabels[error] ? errorLabels[error] : error)).join("\n")
            : "",
        error: field.errors && field.errors.length > 0,
        required: field.required && field.showIsRequired,
        disabled: disabled,
    };

    switch (field.type) {
        case "select": {
            return field.multiple ? (
                <MultipleSelector
                    {...commonProps}
                    placeholder={field.placeholder}
                    selected={field.value}
                    options={field.options}
                />
            ) : (
                <Selector
                    {...commonProps}
                    placeholder={field.placeholder}
                    selected={field.value}
                    options={field.options}
                />
            );
        }

        case "radio": {
            return <RadioButtonsGroup {...commonProps} selected={field.value} options={field.options} />;
        }

        case "checkboxes": {
            return <CheckboxesGroup {...commonProps} selected={field.value} options={field.options} />;
        }

        case "text":
            return field.multiline ? (
                <TextArea {...commonProps} value={field.value} />
            ) : (
                <TextInput {...commonProps} value={field.value} />
            );

        case "boolean": {
            return <Checkbox {...commonProps} checked={field.value} />;
        }
    }
});
