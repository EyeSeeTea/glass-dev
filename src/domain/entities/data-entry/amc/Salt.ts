export type Salt = "hippurate" | "ethylsuccinate" | "mandelate" | "default";

export type SaltKey = "HIPP" | "ESUC" | "MAND";

export const SALT_MAPPING: Record<string, Salt> = {
    HIPP: "hippurate",
    ESUC: "ethylsuccinate",
    MAND: "mandelate",
    default: "default",
};
