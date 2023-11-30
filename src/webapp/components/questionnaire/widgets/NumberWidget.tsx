import React from "react";
// @ts-ignore
import { Input } from "@dhis2/ui";
import styled from "styled-components";
import { BaseWidgetProps } from "./BaseWidget";
import {
    NumberQuestion,
    QuestionnaireQuestionM,
    ValidationErrorMessage,
} from "../../../../domain/entities/Questionnaire";
import { Maybe } from "../../../../types/utils";
import { glassColors } from "../../../pages/app/themes/dhis2.theme";

export interface NumberWidgetProps extends BaseWidgetProps<string> {
    value: Maybe<string>;
    numberType: NumberQuestion["numberType"];
    validationError: Maybe<ValidationErrorMessage>;
}

const NumberWidget: React.FC<NumberWidgetProps> = props => {
    const { onChange: onValueChange, value, numberType, validationError } = props;

    const [stateValue, setStateValue] = React.useState(value);
    React.useEffect(() => setStateValue(value), [value]);

    const updateState = React.useCallback(({ value }: { value: string }) => {
        setStateValue(value);
    }, []);

    const notifyChange = React.useCallback(
        ({ value: newValue }: { value: string }) => {
            if (!isValidNumberValue(newValue, numberType)) {
                setStateValue(value);
            } else if (value !== newValue) {
                onValueChange(newValue);
            }
        },
        [onValueChange, value, numberType]
    );

    return (
        <>
            <Input
                type="number"
                onBlur={notifyChange}
                onChange={updateState}
                value={stateValue || ""}
                disabled={props.disabled}
                error={validationError !== undefined}
            />
            <ValidationErrorText>{validationError}</ValidationErrorText>
        </>
    );
};

const { isValidNumberValue } = QuestionnaireQuestionM;

export default React.memo(NumberWidget);

const ValidationErrorText = styled.p`
    margin: 0;
    font-size: 12px;
    line-height: 14px;
    color: ${glassColors.negative};
`;
