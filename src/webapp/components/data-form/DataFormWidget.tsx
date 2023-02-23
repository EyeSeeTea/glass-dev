import React from "react";
import { DataValue } from "../../../domain/entities/DataValue";
import BooleanWidget from "./widgets/BooleanWidget";
import NumberWidget from "./widgets/NumberWidget";
import TextWidget from "./widgets/TextWidget";
import SingleSelectWidget from "./widgets/SingleSelectWidget";
import MultipleSelectWidget from "./widgets/MultipleSelectWidget";
import { WidgetProps } from "./widgets/WidgetBase";
import { DataFormInfo } from "./DataFormComponent";
import { DataElement } from "../../../domain/entities/DataElement";
import { assertUnreachable } from "../../../types/utils";
import { WidgetState } from "./WidgetFeedback";

interface DataEntryItemProps {
    dataElement: DataElement;
    dataFormInfo: DataFormInfo;
    onValueChange: (dataValue: DataValue) => Promise<void>;
}

const DataEntryItem: React.FC<DataEntryItemProps> = props => {
    const { dataElement } = props;
    const [dataValue, state, notifyChange] = useUpdatableDataValueWithFeedback(props);

    const { type } = dataValue;
    const { options } = dataElement;
    const disabled = false;

    if (options) {
        switch (type) {
            case "BOOLEAN":
                return <>Boolean with options not supported</>;
            case "TEXT":
            case "NUMBER":
                return dataValue.isMultiple ? (
                    <MultipleSelectWidget
                        dataValue={dataValue}
                        options={options.items}
                        onValueChange={notifyChange}
                        state={state}
                        disabled={disabled}
                    />
                ) : (
                    <SingleSelectWidget
                        dataValue={dataValue}
                        options={options.items}
                        onValueChange={notifyChange}
                        state={state}
                        disabled={disabled}
                    />
                );
            default:
                assertUnreachable(type);
        }
    } else if (!dataValue.isMultiple) {
        switch (type) {
            case "BOOLEAN":
                return (
                    <BooleanWidget
                        dataValue={dataValue}
                        onValueChange={notifyChange}
                        state={state}
                        disabled={disabled} //
                    />
                );
            case "NUMBER":
                return (
                    <NumberWidget
                        dataValue={dataValue}
                        onValueChange={notifyChange}
                        state={state}
                        disabled={disabled} //
                    />
                );
            case "TEXT":
                return (
                    <TextWidget
                        dataValue={dataValue}
                        onValueChange={notifyChange}
                        state={state}
                        disabled={disabled} //
                    />
                );
            default:
                return assertUnreachable(type);
        }
    } else {
        return <p>Data element not supported: {JSON.stringify(dataValue.dataElement)}</p>;
    }
};

function useUpdatableDataValueWithFeedback(options: DataEntryItemProps) {
    const { onValueChange, dataFormInfo, dataElement } = options;
    const [state, setState] = React.useState<WidgetState>("original");

    const [dataValue, setDataValue] = React.useState<DataValue>(() => {
        return dataFormInfo.data.values.getOrEmpty(dataElement, dataFormInfo);
    });

    const notifyChange = React.useCallback<WidgetProps["onValueChange"]>(
        dataValue => {
            setState("saving");
            setDataValue(dataValue);

            onValueChange(dataValue)
                .then(() => setState("saveSuccessful"))
                .catch(() => setState("saveError"));
        },
        [onValueChange]
    );

    return [dataValue, state, notifyChange] as const;
}

export default React.memo(DataEntryItem);
