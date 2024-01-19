export type Salt = "hippurate" | "ethylsuccinate" | "mandelate" | "default";

export type SaltKey = "HIPP" | "ESUC" | "MAND" | "default" | "XXXX";

export const SALT_MAPPING: Record<string, Salt> = {
    HIPP: "hippurate",
    ESUC: "ethylsuccinate",
    MAND: "mandelate",
    XXXX: "default",
    default: "default",
};
