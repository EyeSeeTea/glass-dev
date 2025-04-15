export enum YesNoOptions {
    YES = "YES",
    NO = "NO",
}

export function getSafeYesNoOptions(value: unknown): YesNoOptions | undefined {
    return Object.values(YesNoOptions).includes(value as YesNoOptions) ? (value as YesNoOptions) : undefined;
}
