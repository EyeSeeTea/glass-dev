import React, { useEffect, useState } from "react";
import { TextField, InputLabel } from "@material-ui/core";
import styled from "styled-components";
import { useDebounce } from "../../../hooks/useDebounce";

type TextInputProps = {
    id: string;
    label?: string;
    value: string;
    onChange: (newValue: string) => void;
    helperText?: string;
    errorText?: string;
    required?: boolean;
    disabled?: boolean;
    error?: boolean;
};

export const TextInput: React.FC<TextInputProps> = React.memo(
    ({
        id,
        label,
        value,
        onChange,
        helperText = "",
        errorText = "",
        required = false,
        disabled = false,
        error = false,
    }) => {
        const [textFieldValue, setTextFieldValue] = useState<string>(value || "");
        const debouncedTextFieldValue = useDebounce(textFieldValue);

        useEffect(() => {
            if (debouncedTextFieldValue !== value) {
                onChange(debouncedTextFieldValue);
            }
        }, [debouncedTextFieldValue, onChange, value]);

        return (
            <Container>
                {label && (
                    <Label className={required ? "required" : ""} htmlFor={id}>
                        {label}
                    </Label>
                )}

                <StyledTextField
                    id={id}
                    value={textFieldValue}
                    onChange={event => setTextFieldValue(event.target.value)}
                    helperText={error && !!errorText ? errorText : helperText}
                    error={error}
                    disabled={disabled}
                    required={required}
                    variant="outlined"
                />
            </Container>
        );
    }
);

const Container = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
`;

const Label = styled(InputLabel)`
    display: inline-block;
    font-weight: 700;
    font-size: 0.875rem;
    margin-block-end: 8px;

    &.required::after {
        content: "*";
        margin-inline-start: 4px;
    }
`;

const StyledTextField = styled(TextField)<{ error?: boolean }>`
    height: 40px;
    .MuiOutlinedInput-root {
        height: 40px;
    }
    .MuiFormHelperText-root {
    }
    .MuiInputBase-input {
        padding-inline: 12px;
        padding-block: 10px;
    }
`;
