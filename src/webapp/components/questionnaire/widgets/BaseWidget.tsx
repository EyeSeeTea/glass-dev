import { Maybe } from "../../../../types/utils";

export interface BaseWidgetProps<T> {
    onChange(value: Maybe<T>): void;
    disabled: boolean;
}
