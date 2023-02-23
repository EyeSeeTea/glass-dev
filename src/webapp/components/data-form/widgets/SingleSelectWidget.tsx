import React from "react";
// @ts-ignore
import { SingleSelect, SingleSelectOption } from "@dhis2/ui";
import { Option } from "../../../../domain/entities/DataElement";
import { WidgetFeedback } from "../WidgetFeedback";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { DataValueNumberSingle, DataValueTextSingle } from "../../../../domain/entities/DataValue";
import { WidgetProps } from "./WidgetBase";

type DataValueSingle = DataValueNumberSingle | DataValueTextSingle;

export interface SingleSelectWidgetProps extends WidgetProps {
    dataValue: DataValueSingle;
    options: Option<string>[];
}

const SingleSelectWidget: React.FC<SingleSelectWidgetProps> = props => {
    const { onValueChange, dataValue, disabled, options } = props;

    const notifyChange = React.useCallback(
        ({ selected }: { selected: string }) => {
            onValueChange({ ...dataValue, value: selected });
        },
        [onValueChange, dataValue]
    );

    return (
        <WidgetFeedback state={props.state}>
            <SingleSelect
                onChange={notifyChange}
                selected={dataValue.value}
                disabled={disabled}
                placeholder={i18n.t("Select")}
                clearable={true}
                clearText="✕"
            >
                {options.map(option => (
                    <SingleSelectOption key={`option-${option.value}`} label={option.name} value={option.value} />
                ))}
            </SingleSelect>
        </WidgetFeedback>
    );
};

export default React.memo(SingleSelectWidget);
