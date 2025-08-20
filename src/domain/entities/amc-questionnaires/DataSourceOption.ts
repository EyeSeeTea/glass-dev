import { Option, OptionType, OptionValue } from "./Option";

export const DataSourceValues = {
    imports: "IMPORT",
    localManufacturers: "LOCAL_PROD",
    nonGovernmentalOrganizations: "NGO",
    internationalPrograms: "INT_PROG",
    publicCentralDrugStores: "PUB_CDS",
    privateWholesalersDistributors: "PRIV_DISTRIB",
    insuranceSchemes: "INSUR",
    hospitals: "HOSP",
    communityPharmacies: "PHARM",
    marketResearchCompanies: "MRS",
    doctors: "DOCTORS",
} as const;

export type DataSourceValue = OptionValue<typeof DataSourceValues>;

export type DataSourceOption = OptionType<DataSourceValue>;

export const dataSourceOption = new Option(DataSourceValues);
