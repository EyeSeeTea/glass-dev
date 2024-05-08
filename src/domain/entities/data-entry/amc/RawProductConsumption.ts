export type RawProductConsumption = {
    AMR_GLASS_AMC_TEA_PRODUCT_ID: string;
    packages_manual: number;
    data_status_manual: number;
    health_sector_manual: string;
    health_level_manual: string;
};

export const RAW_PRODUCT_CONSUMPTION_KEYS = [
    "AMR_GLASS_AMC_TEA_PRODUCT_ID",
    "date",
    "packages_manual",
    "data_status_manual",
    "health_sector_manual",
    "health_level_manual",
];
