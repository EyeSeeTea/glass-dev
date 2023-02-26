import React from "react";
// @ts-ignore
import { Input } from "@dhis2/ui";
import { BaseWidgetProps } from "./BaseWidget";
import { NumberQuestion, QuestionnaireQuestionM } from "../../../../domain/entities/Questionnaire";
import { Maybe } from "../../../../types/utils";

export interface NumberWidgetProps extends BaseWidgetProps<string> {
    value: Maybe<string>;
    numberType: NumberQuestion["numberType"];
}

const NumberWidget: React.FC<NumberWidgetProps> = props => {
    const { onChange: onValueChange, value, numberType } = props;

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
            />
        </>
    );
};

const { isValidNumberValue } = QuestionnaireQuestionM;

export default React.memo(NumberWidget);
