import React from "react";
// @ts-ignore
import { Radio } from "@dhis2/ui";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { Maybe } from "../../../types/utils";
import { BaseWidgetProps } from "./BaseWidget";
import { makeStyles } from "@material-ui/core";

export interface SingleSelectWidgetProps extends BaseWidgetProps<boolean> {
    value: Maybe<boolean>;
}

const SingleSelectWidget: React.FC<SingleSelectWidgetProps> = props => {
    const { onValueChange, value } = props;

    const notifyChange = React.useCallback(
        (newValue: boolean) => {
            const sameSelected = value === newValue;
            onValueChange(sameSelected ? undefined : newValue);
        },
        [onValueChange, value]
    );

    const classes = useStyles();

    return (
        <div className={classes.wrapper}>
            <Radio
                checked={value === true}
                label={i18n.t("Yes")}
                disabled={props.disabled}
                onChange={() => notifyChange(true)}
            />

            <Radio
                checked={value === false}
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

export default React.memo(SingleSelectWidget);
