import React from "react";
// @ts-ignore
import { MultiSelect, MultiSelectOption } from "@dhis2/ui";
import { Option } from "../../../../domain/entities/DataElement";
import { WidgetFeedback } from "../WidgetFeedback";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { DataValueNumberMultiple, DataValueTextMultiple } from "../../../../domain/entities/DataValue";
import { WidgetProps } from "./WidgetBase";

type DataValueMultiple = DataValueNumberMultiple | DataValueTextMultiple;

export interface MultipleSelectWidgetProps extends WidgetProps {
    dataValue: DataValueMultiple;
    options: Option<string>[];
}

const MultipleSelectWidget: React.FC<MultipleSelectWidgetProps> = props => {
    const { onValueChange, disabled, options, dataValue } = props;

    const notifyChange = React.useCallback(
        ({ selected }: { selected: string[] }) => {
            onValueChange({ ...dataValue, values: selected });
        },
        [onValueChange, dataValue]
    );

    return (
        <WidgetFeedback state={props.state}>
            <MultiSelect
                onChange={notifyChange}
                selected={dataValue.values}
                disabled={disabled}
                placeholder={i18n.t("Select")}
            >
                {options.map(option => (
                    <MultiSelectOption key={option.value} label={option.name} value={option.value} />
                ))}
            </MultiSelect>
        </WidgetFeedback>
    );
};

export default React.memo(MultipleSelectWidget);
