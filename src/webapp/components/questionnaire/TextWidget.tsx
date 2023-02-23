import React from "react";
// @ts-ignore
import { Input, TextArea } from "@dhis2/ui";
import { BaseWidgetProps } from "./BaseWidget";

export interface TextWidgetProps extends BaseWidgetProps<string> {
    value: string;
    multiline: boolean;
}

const TextWidget: React.FC<TextWidgetProps> = props => {
    const { onValueChange, value } = props;

    const [stateValue, setStateValue] = React.useState(value);
    React.useEffect(() => setStateValue(value), [value]);

    const updateState = React.useCallback(({ value }: { value: string }) => {
        setStateValue(value);
    }, []);

    const notifyChange = React.useCallback(
        ({ value }: { value: string }) => {
            onValueChange(value);
        },
        [onValueChange]
    );

    return (
        <>
            {props.multiline ? (
                <TextArea onBlur={notifyChange} onChange={updateState} value={stateValue} disabled={props.disabled} />
            ) : (
                <Input onBlur={notifyChange} onChange={updateState} value={stateValue} disabled={props.disabled} />
            )}
        </>
    );
};

export default React.memo(TextWidget);
