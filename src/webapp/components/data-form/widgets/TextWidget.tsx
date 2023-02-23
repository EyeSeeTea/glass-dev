import React from "react";
// @ts-ignore
import { Input } from "@dhis2/ui";
import { WidgetFeedback } from "../WidgetFeedback";
import { DataValueTextSingle } from "../../../../domain/entities/DataValue";
import { WidgetProps } from "./WidgetBase";

export interface TextWidgetProps extends WidgetProps {
    dataValue: DataValueTextSingle;
}

const TextWidget: React.FC<TextWidgetProps> = props => {
    const { onValueChange, dataValue, disabled } = props;

    const [stateValue, setStateValue] = React.useState(dataValue.value);
    React.useEffect(() => setStateValue(dataValue.value), [dataValue.value]);

    const updateState = React.useCallback(({ value }: { value: string }) => {
        setStateValue(value);
    }, []);

    const notifyChange = React.useCallback(
        ({ value }: { value: string }) => {
            onValueChange({ ...dataValue, value });
        },
        [onValueChange, dataValue]
    );

    return (
        <WidgetFeedback state={props.state}>
            <Input onBlur={notifyChange} onChange={updateState} value={stateValue} disabled={disabled} />
        </WidgetFeedback>
    );
};

export default React.memo(TextWidget);
