import React, { useEffect, useState } from "react";
import { TextField, InputLabel } from "@material-ui/core";
import styled from "styled-components";
import { useDebounce } from "../../../hooks/useDebounce";

type NumberInputProps = {
    id: string;
    label?: string;
    value: number;
    onChange: (newValue: number) => void;
    helperText?: string;
    errorText?: string;
    required?: boolean;
    disabled?: boolean;
    error?: boolean;
};

export const NumberInput: React.FC<NumberInputProps> = React.memo(
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
        const [inputValue, setInputValue] = useState<string>(value.toString());
        const debouncedValue = useDebounce(inputValue);

        useEffect(() => {
            const parsed = Number(debouncedValue);
            if (!isNaN(parsed)) {
                onChange(parsed);
            }
        }, [debouncedValue, onChange]);

        return (
            <Container>
                {label && (
                    <Label className={required ? "required" : ""} htmlFor={id}>
                        {label}
                    </Label>
                )}
                <StyledTextField
                    id={id}
                    type="number"
                    value={inputValue}
                    onChange={e => {
                        const val = e.target.value;
                        // Prevent empty string — fallback to 0
                        setInputValue(val === "" ? "0" : val);
                    }}
                    helperText={error && errorText ? errorText : helperText}
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
    margin-bottom: 8px;

    &.required::after {
        content: "*";
        margin-left: 4px;
    }
`;

const StyledTextField = styled(TextField)`
    height: 40px;
    .MuiOutlinedInput-root {
        height: 40px;
    }
    .MuiInputBase-input {
        padding: 10px 12px;
    }
`;
