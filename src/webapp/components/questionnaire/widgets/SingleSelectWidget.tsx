import React from "react";
// @ts-ignore
import { Radio, Button } from "@dhis2/ui";
import { Id } from "../../../../domain/entities/Base";
import { Maybe } from "../../../../types/utils";
import { BaseWidgetProps } from "./BaseWidget";
import { makeStyles } from "@material-ui/core";

export interface SingleSelectWidgetProps extends BaseWidgetProps<Option> {
    value: Maybe<Id>;
    options: Option[];
}

type Option = { id: string; name: string };

const SingleSelectWidget: React.FC<SingleSelectWidgetProps> = props => {
    const { onChange: onValueChange, value, options } = props;

    const [stateValue, setStateValue] = React.useState(value);
    React.useEffect(() => setStateValue(value), [value]);

    const notifyChange = React.useCallback(
        (selectedId: Maybe<Id>) => {
            const option = options.find(option => option.id === selectedId);
            setStateValue(selectedId);
            onValueChange(option);
        },
        [onValueChange, options]
    );

    const classes = useStyles();

    return (
        <div className={classes.horizontalWrapper}>
            <div className={options.length <= 3 ? classes.horizontalWrapper : classes.verticalWrapper}>
                {options.map(option => (
                    <Radio
                        key={option.id}
                        checked={stateValue === option.id}
                        label={option.name}
                        disabled={props.disabled}
                        onChange={() => notifyChange(option.id)}
                    />
                ))}
            </div>
            <div>
                <Button small onClick={() => notifyChange(undefined)} tabIndex="-1" disabled={props.disabled}>
                    ✕
                </Button>
            </div>
        </div>
    );
};

const useStyles = makeStyles({
    horizontalWrapper: { display: "flex", gap: 10, padding: 5 },
    verticalWrapper: { display: "flex", gap: 10, flexDirection: "column", padding: 5 },
});

export default React.memo(SingleSelectWidget);
