import { Option, OptionType, OptionValue } from "./Option";

export const ProcurementLevelValues = {
    ImportOnly: "IMPORT",
    LocalManufacturing: "PROD",
    ImportAndLocalManufacturing: "IMP+PROD",
} as const;

export type ProcurementLevelValue = OptionValue<typeof ProcurementLevelValues>;

export type ProcurementLevelOption = OptionType<ProcurementLevelValue>;

export const procurementLevelOption = new Option(ProcurementLevelValues);
