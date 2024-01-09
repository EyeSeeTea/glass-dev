export type Unit =
    | "gram"
    | "milligram"
    | "international unit"
    | "millions international unit"
    | "unit dose"
    | "milliliter"
    | "liter";

export type UnitKey = "UD" | "G" | "MG" | "MU";

export const GRAM_FAMILY: Unit[] = ["gram", "milligram"];
export const INTERNATIONAL_UNIT_FAMILY: Unit[] = ["international unit", "millions international unit"];
export const UNIT_DOSE_FAMILY: Unit[] = ["unit dose"];
export const LITER_FAMILY: Unit[] = ["liter", "milliliter"];

export const VALID_STRENGTH_UNITS: Unit[] = [...GRAM_FAMILY, ...INTERNATIONAL_UNIT_FAMILY, ...UNIT_DOSE_FAMILY];

export const UNITS_TO_STANDARDIZED_MEASUREMENT_UNIT: Record<Unit, Unit> = {
    milligram: "gram",
    gram: "gram",
    "international unit": "millions international unit",
    "millions international unit": "millions international unit",
    "unit dose": "unit dose",
    milliliter: "milliliter",
    liter: "milliliter",
};

export const CONVERSION_TO_STANDARDIZED_MEASUREMENT_UNIT: Record<Unit, number> = {
    milligram: 0.001,
    gram: 1,
    "international unit": 0.000001,
    "millions international unit": 1,
    "unit dose": 1,
    milliliter: 1,
    liter: 1000,
};

export const UNITS_MAPPING: Record<string, Unit> = {
    G: "gram",
    MG: "milligram",
    IU: "international unit",
    MU: "millions international unit",
    UD: "unit dose",
    L: "liter",
    ML: "milliliter",
};

export function isStrengthUnitValid(strengthUnit: Unit): boolean {
    return VALID_STRENGTH_UNITS.includes(strengthUnit);
}

export function isConcVolumeUnitOrVolumeUnitValid(concVolumeUnit: Unit): boolean {
    return LITER_FAMILY.includes(concVolumeUnit);
}

export function valueToStandardizedMeasurementUnit(value: number, unit: Unit): number {
    return value * CONVERSION_TO_STANDARDIZED_MEASUREMENT_UNIT[unit];
}
