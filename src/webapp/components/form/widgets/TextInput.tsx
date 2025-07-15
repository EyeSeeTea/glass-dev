import React, { useEffect, useState } from "react";
import { TextField, InputLabel } from "@material-ui/core";
import styled from "styled-components";
import { useDebounce } from "../../../hooks/useDebounce";
import { palette } from "../../../pages/app/themes/dhis2.theme";

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
        const [isUserTyping, setIsUserTyping] = useState<boolean>(false);
        const debouncedTextFieldValue = useDebounce(textFieldValue);

        // Handle prop value changes (external updates)
        useEffect(() => {
            if (value !== textFieldValue && !isUserTyping) {
                setTextFieldValue(value || "");
                onChange(value || "");
            }
        }, [value, textFieldValue, isUserTyping, onChange]);

        // Handle debounced user input
        useEffect(() => {
            if (isUserTyping && debouncedTextFieldValue !== value) {
                onChange(debouncedTextFieldValue);
                setIsUserTyping(false);
            }
        }, [debouncedTextFieldValue, isUserTyping, value, onChange]);

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
                    onChange={event => {
                        setTextFieldValue(event.target.value);
                        setIsUserTyping(true);
                    }}
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

const StyledTextField = styled(TextField)<{ error?: boolean; disabled?: boolean; helperText?: string }>`
    height: ${({ helperText }) => (helperText ? "auto" : "40px")};
    .MuiOutlinedInput-root {
        height: ${({ helperText }) => (helperText ? "auto" : "40px")};
        background-color: ${({ disabled }) => (disabled ? palette.background.default : "inherit")};
        opacity: ${({ disabled }) => (disabled ? 0.8 : 1)};
    }
    .MuiFormHelperText-root {
        color: ${({ disabled }) => (disabled ? palette.text.disabled : "inherit")};
    }
    .MuiInputBase-input {
        padding-inline: 12px;
        padding-block: 10px;
        color: ${({ disabled }) => (disabled ? palette.text.disabled : "inherit")};
    }
`;
