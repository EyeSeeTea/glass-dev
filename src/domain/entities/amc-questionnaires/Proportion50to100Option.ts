import { Option, OptionType, OptionValue } from "./Option";

export const Proportion50to100Values = {
    PROP_50_59: "50%-59%",
    PROP_60_69: "60%-69%",
    PROP_70_79: "70%-79%",
    PROP_80_89: "80%-89%",
    PROP_90_99: "90%-99%",
    PROP_100: "100%",
} as const;

export type Proportion50to100Value = OptionValue<typeof Proportion50to100Values>;

export type Proportion50to100Option = OptionType<Proportion50to100Value>;

export const proportion50to100Option = new Option(Proportion50to100Values);
