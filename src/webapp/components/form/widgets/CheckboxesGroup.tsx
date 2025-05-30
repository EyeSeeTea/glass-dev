import { Checkbox as MUICheckbox, FormLabel, FormHelperText, FormControlLabel, FormGroup } from "@material-ui/core";
import React from "react";
import styled from "styled-components";

import { FormOption } from "../presentation-entities/FormOption";

type CheckboxesGroupProps<Value extends string = string> = {
    id: string;
    label?: string;
    selected: Value[];
    onChange: (value: Value[]) => void;
    options: FormOption<Value>[];
    gap?: string;
    helperText?: string;
    errorText?: string;
    error?: boolean;
    disabled?: boolean;
    required?: boolean;
};

export function CheckboxesGroup<Value extends string>({
    id,
    selected,
    label,
    onChange,
    options,
    gap = "24px",
    helperText = "",
    errorText = "",
    error = false,
    disabled = false,
    required = false,
}: CheckboxesGroupProps<Value>) {
    const notifyChange = React.useCallback(
        (
            event: React.ChangeEvent<{
                value: unknown;
            }>
        ) => {
            const selectedValue = (event.target as HTMLInputElement).name as Value;
            const isChecked = selected.includes(selectedValue);
            const value = isChecked
                ? selected.filter(selection => selection !== selectedValue)
                : [...selected, selectedValue];
            onChange(value);
        },
        [onChange, selected]
    );

    return (
        <Container>
            {label && (
                <Label className={required ? "required" : ""} htmlFor={id}>
                    {label}
                </Label>
            )}

            <StyledCheckboxesGroup aria-label={id} gap={gap}>
                {options.map(option => (
                    <FormControlLabel
                        key={option.value}
                        control={
                            <MUICheckbox
                                checked={selected.includes(option.value)}
                                onChange={notifyChange}
                                name={option.value}
                            />
                        }
                        label={option.label}
                        disabled={option.disabled || disabled}
                        aria-label={option.label}
                    />
                ))}
            </StyledCheckboxesGroup>

            <StyledFormHelperText id={`${id}-helper-text`} error={error && !!errorText}>
                {error && !!errorText ? errorText : helperText}
            </StyledFormHelperText>
        </Container>
    );
}

const Container = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
`;

const Label = styled(FormLabel)`
    display: inline-block;
    font-weight: 700;
    font-size: 0.875rem;
    margin-block-end: 8px;

    &.required::after {
        content: "*";
        margin-inline-start: 4px;
    }
`;

const StyledCheckboxesGroup = styled(FormGroup)<{ gap: string }>`
    flex-direction: row;
    gap: ${props => props.gap};
`;

const StyledFormHelperText = styled(FormHelperText)<{ error?: boolean }>``;
