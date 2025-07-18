import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { FormHelperText, TextareaAutosize } from "@material-ui/core";
import { useDebounce } from "../../../hooks/useDebounce";

type TextAreaProps = {
    id: string;
    label?: string;
    value: string;
    onChange: (text: string) => void;
    disabled?: boolean;
    helperText?: string;
    errorText?: string;
    error?: boolean;
    required?: boolean;
};

export const TextArea: React.FC<TextAreaProps> = React.memo(
    ({
        id,
        label,
        value,
        onChange,
        disabled = false,
        helperText = "",
        errorText = "",
        error = false,
        required = false,
    }) => {
        const [textFieldValue, setTextFieldValue] = useState(value || "");
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

                <StyledTextareaAutosize
                    id={id}
                    aria-label={label || `${id}-label`}
                    value={textFieldValue}
                    onChange={event => setTextFieldValue(event.target.value)}
                    minRows={3}
                    disabled={disabled}
                    $hasError={error}
                />

                <StyledFormHelperText id={`${id}-helper-text`} error={error && !!errorText}>
                    {error && !!errorText ? errorText : helperText}
                </StyledFormHelperText>
            </Container>
        );
    }
);

const Container = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
`;

const Label = styled.label`
    display: inline-block;
    font-weight: 700;
    font-size: 0.875rem;
    margin-block-end: 8px;

    &.required::after {
        content: "*";
        margin-inline-start: 4px;
    }
`;

const StyledTextareaAutosize = styled(TextareaAutosize)<{
    $hasError?: boolean;
    disabled?: boolean;
}>`
    display: inline-block;
    font-family: Roboto, Arial, sans-serif;
    font-weight: 400;
    font-size: 0.875rem;
    padding-inline: 12px;
    padding-block: 10px;
    border-radius: 3px;
    &:focus-visible {
        outline: none;
        border-width: 2px;
    }
    &:hover:focus-visible {
    }
    &:hover {
    }
`;

const StyledFormHelperText = styled(FormHelperText)<{ error?: boolean }>``;
