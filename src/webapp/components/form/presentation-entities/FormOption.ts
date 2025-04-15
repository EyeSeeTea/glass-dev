export type FormOption<Value extends string = string> = {
    value: Value;
    label: string;
    disabled?: boolean;
};
