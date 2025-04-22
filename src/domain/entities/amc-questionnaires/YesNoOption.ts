export const YesNoValues = {
    YES: "1",
    NO: "0",
} as const;

export type YesNoValue = typeof YesNoValues[keyof typeof YesNoValues];

export type YesNoOption = { code: YesNoValue; name: string };

export function getSafeYesNoValue(value: unknown): YesNoValue | undefined {
    return Object.values(YesNoValues).includes(value as YesNoValue) ? (value as YesNoValue) : undefined;
}

export function getBooleanFromYesNoValue(value: YesNoValue): boolean {
    return value === "1" ? true : false;
}

export function getYesNoValueFromBoolean(value: boolean): YesNoValue {
    return value ? YesNoValues.YES : YesNoValues.NO;
}
