import React from "react";
// @ts-ignore
import { Input } from "@dhis2/ui";
import { BaseWidgetProps } from "./BaseWidget";

export interface NumberWidgetProps extends BaseWidgetProps<string> {
    value: string;
}

const NumberWidget: React.FC<NumberWidgetProps> = props => {
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
            <Input
                type="number"
                onBlur={notifyChange}
                onChange={updateState}
                value={stateValue}
                disabled={props.disabled}
            />
        </>
    );
};

export default React.memo(NumberWidget);
