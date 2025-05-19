import { Option, OptionValue, OptionType } from "./Option";

export const YesNoUnknownValues = {
    YES: "YES",
    NO: "NO",
    UNKNOWN: "UNK",
} as const;

export type YesNoUnknownValue = OptionValue<typeof YesNoUnknownValues>;

export type YesNoUnknownOption = OptionType<YesNoUnknownValue>;

export const yesNoUnknownOption = new Option(YesNoUnknownValues);
