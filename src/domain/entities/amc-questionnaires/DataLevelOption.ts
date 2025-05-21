import { Option, OptionType, OptionValue } from "./Option";

export const DataLevelValues = {
    Procurement: "PROC",
    Distribution: "DISTR",
    Prescription: "PRESC",
    Dispensing: "SALES",
    Reimbursment: "REIMB",
    Mixed: "MIXED",
} as const;

export type DataLevelValue = OptionValue<typeof DataLevelValues>;

export type DataLevelOption = OptionType<DataLevelValue>;

export const dataLevelOption = new Option(DataLevelValues);
