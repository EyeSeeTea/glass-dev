import React, { useCallback } from "react";
import styled from "styled-components";
import { Select, InputLabel, FormHelperText, MenuItem } from "@material-ui/core";
import { IconChevronDown24, IconCross16 } from "@dhis2/ui";
import { getLabelFromValue } from "./utils/selectorHelper";
import { FormOption } from "../presentation-entities/FormOption";
import { IconButton } from "../../icon-button/IconButton";
import { palette } from "../../../pages/app/themes/dhis2.theme";

type SelectorProps<Value extends string = string> = {
    id: string;
    selected: Value;
    onChange: (value: Value) => void;
    options: FormOption<Value>[];
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    helperText?: string;
    errorText?: string;
    error?: boolean;
    required?: boolean;
    disableSearch?: boolean;
    allowClear?: boolean;
    addNewOption?: boolean;
};

export function Selector<Value extends string>({
    id,
    label,
    placeholder = "",
    selected,
    onChange,
    options,
    disabled = false,
    helperText = "",
    errorText = "",
    error = false,
    required = false,
    allowClear = false,
}: SelectorProps<Value>): JSX.Element {
    const handleSelectChange = useCallback(
        (
            event: React.ChangeEvent<{
                value: unknown;
            }>
        ) => {
            const value = event.target.value as Value;
            if (value && options.find(option => option.value === value)) {
                onChange(value);
            }
        },
        [options, onChange]
    );

    const onClearValue = useCallback(
        (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            if (allowClear) {
                event.stopPropagation();
                onChange("" as Value);
            }
        },
        [allowClear, onChange]
    );

    return (
        <Container>
            {label && (
                <Label className={required ? "required" : ""} htmlFor={id}>
                    {label}
                </Label>
            )}

            <StyledSelect
                labelId={label || `${id}-label`}
                id={id}
                value={selected}
                onChange={handleSelectChange}
                disabled={disabled}
                variant="outlined"
                IconComponent={IconChevronDown24}
                error={error}
                renderValue={(selected: unknown) => {
                    const value = getLabelFromValue(selected as Value, options);
                    if (value) {
                        return (
                            <div>
                                {value}
                                {allowClear ? (
                                    <StyledIconButton
                                        className="clear-icon"
                                        ariaLabel="Clear value"
                                        icon={<IconCross16 />}
                                        onClick={event => onClearValue(event)}
                                        onMouseDown={event => onClearValue(event)}
                                    />
                                ) : null}
                            </div>
                        );
                    } else {
                        return placeholder;
                    }
                }}
                displayEmpty
            >
                {options.map(option => (
                    <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                    </MenuItem>
                ))}
            </StyledSelect>

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

const StyledFormHelperText = styled(FormHelperText)<{ error?: boolean }>``;

const StyledSelect = styled(Select)<{ error?: boolean; disabled?: boolean }>`
    height: 40px;
    .MuiOutlinedInput-notchedOutline {
    }
    .MuiSelect-root {
        padding-inline-start: 12px;
        padding-inline-end: 6px;
        padding-block: 10px;
        &:focus {
        }
        background-color: ${({ disabled }) => (disabled ? palette.background.default : "inherit")};
        opacity: ${({ disabled }) => (disabled ? 0.8 : 1)};
    }
`;

const StyledIconButton = styled(IconButton)`
    padding: 3px;
    margin-inline-start: 4px;
`;
