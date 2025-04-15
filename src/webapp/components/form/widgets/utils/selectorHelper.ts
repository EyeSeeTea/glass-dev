import { FormOption } from "../../presentation-entities/FormOption";

export function getLabelFromValue<Value extends string = string>(value: Value, options: FormOption<Value>[]) {
    return options.find(option => option.value === value)?.label;
}
