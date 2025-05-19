import { Option, OptionType, OptionValue } from "./Option";

export const HealthLevelValues = {
    Total: "TOT",
    HospitalAndCommunity: "H+C",
    Community: "C",
    Hospital: "H",
} as const;

export type HealthLevelValue = OptionValue<typeof HealthLevelValues>;

export type HealthLevelOption = OptionType<HealthLevelValue>;

export const healthLevelOption = new Option(HealthLevelValues);
