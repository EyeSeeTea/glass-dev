import { Option, OptionType, OptionValue } from "./Option";

export const AntimicrobialClassValues = {
    Antibacterials: "ATB",
    Antifungals: "ATF",
    Antivirals: "ATV",
    Antituberculosis: "ATT",
    Antimalaria: "ATM",
} as const;

export type AntimicrobialClassValue = OptionValue<typeof AntimicrobialClassValues>;

export type AntimicrobialClassOption = OptionType<AntimicrobialClassValue>;

export const antimicrobialClassOption = new Option(AntimicrobialClassValues);
