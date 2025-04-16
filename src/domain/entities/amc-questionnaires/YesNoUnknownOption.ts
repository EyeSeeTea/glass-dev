export const YesNoUnknownValues = {
    YES: "YES",
    NO: "NO",
    UNKNOWN: "UNK",
} as const;

export type YesNoUnknownValue = typeof YesNoUnknownValues[keyof typeof YesNoUnknownValues];

export type YesNoUnknownOption = { code: YesNoUnknownValue; name: string };

export function getSafeYesNoUnknownValue(value: unknown): YesNoUnknownValue | undefined {
    return Object.values(YesNoUnknownValues).includes(value as YesNoUnknownValue)
        ? (value as YesNoUnknownValue)
        : undefined;
}
