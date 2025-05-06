import { BooleanOption, OptionType, OptionValue } from "./Option";

export const YesNoValues = {
    YES: "1",
    NO: "0",
} as const;

export type YesNoValue = OptionValue<typeof YesNoValues>;

export type YesNoOption = OptionType<YesNoValue>;

export const yesNoOption = new BooleanOption(YesNoValues, {
    toBoolean: value => value === "1",
    fromBoolean: value => (value ? YesNoValues.YES : YesNoValues.NO),
});
