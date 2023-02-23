import { Maybe } from "../../../types/utils";

export interface BaseWidgetProps<T> {
    onValueChange(option: Maybe<T>): void;
    disabled: boolean;
}
