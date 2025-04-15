export enum YesNoUnknownNAOptions {
    YES = "YES",
    NO = "NO",
    UNKNOWN = "UNKNOWN",
    NA = "NA",
}

export function getSafeYesNoUnknownNAOptions(value: unknown): YesNoUnknownNAOptions | undefined {
    return Object.values(YesNoUnknownNAOptions).includes(value as YesNoUnknownNAOptions)
        ? (value as YesNoUnknownNAOptions)
        : undefined;
}
