import React, { useCallback } from "react";
import styled from "styled-components";
import { Select, InputLabel, MenuItem, FormHelperText, Chip } from "@material-ui/core";
import { IconChevronDown24, IconCross16 } from "@dhis2/ui";
import { getLabelFromValue } from "./utils/selectorHelper";
import { FormOption } from "../presentation-entities/FormOption";
import { palette } from "../../../pages/app/themes/dhis2.theme";

type MultipleSelectorProps<Value extends string = string> = {
    id: string;
    selected: Value[];
    onChange: (value: Value[]) => void;
    options: FormOption<Value>[];
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    helperText?: string;
    errorText?: string;
    error?: boolean;
    required?: boolean;
};

export function MultipleSelector<Value extends string>({
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
}: MultipleSelectorProps<Value>): JSX.Element {
    const notifyChange = useCallback(
        (
            event: React.ChangeEvent<{
                value: unknown;
            }>,
            _child: React.ReactNode
        ) => {
            const value = event.target.value as Value[];
            onChange(value);
        },
        [onChange]
    );

    const handleDelete = useCallback(
        (event: React.MouseEvent<HTMLDivElement, MouseEvent>, value: Value) => {
            event.stopPropagation();
            onChange(selected?.filter(selection => selection !== value));
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

            <StyledSelect
                labelId={label || `${id}-label`}
                id={id}
                value={selected}
                onChange={notifyChange}
                disabled={disabled}
                variant="outlined"
                IconComponent={IconChevronDown24}
                error={error}
                renderValue={(selected: unknown) =>
                    (selected as Value[])?.length ? (
                        <SelectedContainer>
                            {(selected as Value[]).map(value => (
                                <SelectedChip
                                    key={value}
                                    label={getLabelFromValue(value, options)}
                                    deleteIcon={<IconCross16 />}
                                    onDelete={event => handleDelete(event, value)}
                                    onMouseDown={event => handleDelete(event, value)}
                                    disabled={disabled}
                                />
                            ))}
                        </SelectedContainer>
                    ) : (
                        placeholder
                    )
                }
                displayEmpty
                multiple
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
    min-height: 40px;
    .MuiOutlinedInput-notchedOutline {
    }
    .MuiSelect-root {
        padding-inline-start: 12px;
        padding-inline-end: 6px;
        padding-block: 1px;
        &:focus {
        }
        background-color: ${({ disabled }) => (disabled ? palette.background.default : "inherit")};
        opacity: ${({ disabled }) => (disabled ? 0.8 : 1)};
    }
`;

const SelectedChip = styled(Chip)`
    margin-inline-end: 16px;
    font-weight: 400;
    font-size: 0.813rem;
    padding-inline-end: 8px;
    svg {
        cursor: pointer;
        &:hover {
        }
    }
`;

const SelectedContainer = styled.div`
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
`;
