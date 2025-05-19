import { Option, OptionType, OptionValue } from "./Option";

export const Proportion50to100UnknownValues = {
    PROP_50_59: "PROP_50_59",
    PROP_60_69: "PROP_60_69",
    PROP_70_79: "PROP_70_79",
    PROP_80_89: "PROP_80_89",
    PROP_90_99: "PROP_90_99",
    PROP_100: "PROP_100",
    UNKNOWN: "UNK",
} as const;

export type Proportion50to100UnknownValue = OptionValue<typeof Proportion50to100UnknownValues>;

export type Proportion50to100UnknownOption = OptionType<Proportion50to100UnknownValue>;

export const proportion50to100UnknownOption = new Option(Proportion50to100UnknownValues);
