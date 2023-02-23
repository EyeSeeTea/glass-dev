import React from "react";
// @ts-ignore
import { SingleSelect, SingleSelectOption } from "@dhis2/ui";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { WidgetFeedback } from "../WidgetFeedback";
import { DataValueBoolean } from "../../../../domain/entities/DataValue";
import { WidgetProps } from "./WidgetBase";
import { Option } from "../../../../domain/entities/DataElement";
import { Maybe } from "../../../../types/utils";

export interface BooleanWidgetProps extends WidgetProps {
    dataValue: DataValueBoolean;
}

const BooleanWidget: React.FC<BooleanWidgetProps> = props => {
    const { onValueChange, dataValue, disabled } = props;

    const notifyChange = React.useCallback(
        (value: { selected: Maybe<string> }) => {
            const { selected } = value;
            onValueChange({
                ...dataValue,
                value: selected === "true" ? true : selected === "false" ? false : undefined,
            });
        },
        [onValueChange, dataValue]
    );

    const options = React.useMemo<Option<string>[]>(
        () => [
            { value: "true", name: i18n.t("Yes") },
            { value: "false", name: i18n.t("No") },
        ],
        []
    );

    const selected = dataValue.value ? "true" : dataValue.value === false ? "false" : undefined;

    return (
        <WidgetFeedback state={props.state}>
            <SingleSelect
                onChange={notifyChange}
                selected={selected}
                disabled={disabled}
                placeholder={i18n.t("Select")}
                clearable={true}
                clearText="✕"
            >
                {options.map(option => (
                    <SingleSelectOption key={option.value} label={option.name} value={option.value} />
                ))}
            </SingleSelect>
        </WidgetFeedback>
    );
};

export default React.memo(BooleanWidget);
