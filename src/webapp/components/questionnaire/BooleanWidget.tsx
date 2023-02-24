import React from "react";
// @ts-ignore
import { Radio } from "@dhis2/ui";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { Maybe } from "../../../types/utils";
import { BaseWidgetProps } from "./BaseWidget";

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

    return (
        <>
            <div onClick={props.disabled ? undefined : () => notifyChange(true)}>
                <Radio checked={value === true} label={i18n.t("Yes")} disabled={props.disabled} />
            </div>

            <div onClick={props.disabled ? undefined : () => notifyChange(false)}>
                <Radio checked={value === false} label={i18n.t("No")} disabled={props.disabled} />
            </div>
        </>
    );
};

export default React.memo(SingleSelectWidget);