import React from "react";
// @ts-ignore
import { Maybe } from "../../../../types/utils";
import { BaseWidgetProps } from "./BaseWidget";
import { DatePicker } from "material-ui";

export interface DatePickerWidgetProps extends BaseWidgetProps<Date> {
    value: Maybe<Date>;
}

const DatePickerWidget: React.FC<DatePickerWidgetProps> = props => {
    const { onChange: onValueChange, value } = props;

    const [stateValue, setStateValue] = React.useState(value);
    React.useEffect(() => setStateValue(value), [value]);

    const notifyChange = React.useCallback(
        (newValue: Date) => {
            setStateValue(newValue);
            onValueChange(newValue);
        },
        [onValueChange]
    );
    return (
        <DatePicker value={stateValue} disabled={props.disabled} onChange={(_e, newValue) => notifyChange(newValue)} />
    );
};

export default React.memo(DatePickerWidget);
