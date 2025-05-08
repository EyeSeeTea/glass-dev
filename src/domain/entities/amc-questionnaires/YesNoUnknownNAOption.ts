export const YesNoUnknownNAValues = {
    YES: "YES",
    NO: "NO",
    UNKNOWN: "UNK",
    NA: "NA",
} as const;

export type YesNoUnknownNAValue = typeof YesNoUnknownNAValues[keyof typeof YesNoUnknownNAValues];

export type YesNoUnknownNAOption = { code: YesNoUnknownNAValue; name: string };

export function getSafeYesNoUnknownNAValue(value: unknown): YesNoUnknownNAValue | undefined {
    return Object.values(YesNoUnknownNAValues).includes(value as YesNoUnknownNAValue)
        ? (value as YesNoUnknownNAValue)
        : undefined;
}
