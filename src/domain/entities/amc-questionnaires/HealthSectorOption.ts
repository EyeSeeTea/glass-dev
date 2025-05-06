import { Option, OptionType, OptionValue } from "./Option";

export const HealthSectorValues = {
    PublicAndPrivate: "PUB+PRV",
    Public: "PUB",
    Private: "PRV",
} as const;

export type HealthSectorValue = OptionValue<typeof HealthSectorValues>;

export type HealthSectorOption = OptionType<HealthSectorValue>;

export const healthSectorOption = new Option(HealthSectorValues);
