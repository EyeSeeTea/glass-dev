import { Option, OptionType, OptionValue } from "./Option";

export const NationalPopulationDataSourceValues = {
    ministryOfHealth: "MHO",
    healthInsuranceScheme: "INSUR",
    nationalStatisticsAgency: "STAT",
    Other: "OTHER",
} as const;

export type NationalPopulationDataSourceValue = OptionValue<typeof NationalPopulationDataSourceValues>;

export type NationalPopulationDataSourceOption = OptionType<NationalPopulationDataSourceValue>;

export const nationalPopulationDataSourceOption = new Option(NationalPopulationDataSourceValues);
