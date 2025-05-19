import { Option, OptionValue, OptionType } from "./Option";

export const YesNoUnknownNAValues = {
    YES: "YES",
    NO: "NO",
    UNKNOWN: "UNK",
    NA: "NA",
} as const;

export type YesNoUnknownNAValue = OptionValue<typeof YesNoUnknownNAValues>;

export type YesNoUnknownNAOption = OptionType<YesNoUnknownNAValue>;

export const yesNoUnknownNAOption = new Option(YesNoUnknownNAValues);
