import React from "react";
// @ts-ignore
import { Radio } from "@dhis2/ui";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { Maybe } from "../../../../types/utils";
import { BaseWidgetProps } from "./BaseWidget";
import { makeStyles } from "@material-ui/core";

export interface YesNoWidgetProps extends BaseWidgetProps<boolean> {
    value: Maybe<boolean>;
}

const YesNoWidget: React.FC<YesNoWidgetProps> = props => {
    const { onChange: onValueChange, value } = props;

    const [stateValue, setStateValue] = React.useState(value);
    React.useEffect(() => setStateValue(value), [value]);

    const notifyChange = React.useCallback(
        (newValue: boolean) => {
            const sameSelected = value === newValue;
            setStateValue(newValue);
            onValueChange(sameSelected ? undefined : newValue);
        },
        [onValueChange, value]
    );

    const classes = useStyles();

    return (
        <div className={classes.wrapper}>
            <Radio
                checked={stateValue === true}
                label={i18n.t("Yes")}
                disabled={props.disabled}
                onChange={() => notifyChange(true)}
            />

            <Radio
                checked={stateValue === false}
                label={i18n.t("No")}
                disabled={props.disabled}
                onChange={() => notifyChange(false)}
            />
        </div>
    );
};

const useStyles = makeStyles({
    wrapper: { display: "flex", gap: 10 },
});

export default React.memo(YesNoWidget);
