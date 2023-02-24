import React from "react";
// @ts-ignore
import { Radio } from "@dhis2/ui";
import { Id } from "../../../domain/entities/Base";
import { Maybe } from "../../../types/utils";
import { BaseWidgetProps } from "./BaseWidget";
import { makeStyles } from "@material-ui/core";

export interface SingleSelectWidgetProps extends BaseWidgetProps<Option> {
    value: Maybe<Id>;
    options: Option[];
}

type Option = { id: string; name: string };

const SingleSelectWidget: React.FC<SingleSelectWidgetProps> = props => {
    const { onValueChange, value, options } = props;

    const [stateValue, setStateValue] = React.useState(value);
    React.useEffect(() => setStateValue(value), [value]);

    const notifyChange = React.useCallback(
        (selectedId: Id) => {
            const option = options.find(option => option.id === selectedId);
            const sameSelected = value === selectedId;
            setStateValue(selectedId);
            onValueChange(sameSelected ? undefined : option);
        },
        [onValueChange, options, value]
    );

    const classes = useStyles();

    return (
        <div className={classes.wrapper}>
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
    );
};

const useStyles = makeStyles({
    wrapper: { display: "flex", gap: 10 },
});

export default React.memo(SingleSelectWidget);
