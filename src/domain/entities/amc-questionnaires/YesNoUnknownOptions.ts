export enum YesNoUnknownOptions {
    YES = "YES",
    NO = "NO",
    UNKNOWN = "UNKNOWN",
}

export function getSafeYesNoUnknownOptions(value: unknown): YesNoUnknownOptions | undefined {
    return Object.values(YesNoUnknownOptions).includes(value as YesNoUnknownOptions)
        ? (value as YesNoUnknownOptions)
        : undefined;
}
