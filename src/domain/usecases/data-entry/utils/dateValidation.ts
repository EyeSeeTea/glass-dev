import moment from "moment";

export type DateValidationError = {
    error: "date_format" | "invalid_date";
    row: number;
    column: string;
    value: string;
    message: string;
};

// Matches exactly YYYY-MM-DD with no surrounding text
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates a date string from a user-uploaded file.
 * Returns a DateValidationError if the value is present but invalid; undefined if absent or valid.
 */
export function validateDateField(
    value: string | null | undefined,
    fieldName: string,
    rowNumber: number
): DateValidationError | undefined {
    if (value === null || value === undefined || value === "") return undefined;

    if (!ISO_DATE_REGEX.test(value)) {
        return {
            error: "date_format",
            row: rowNumber,
            column: fieldName,
            value,
            message: `Invalid date format "${value}" in column "${fieldName}" at row ${rowNumber}. Expected format: YYYY-MM-DD (e.g., 2024-09-23). Please update your file and re-upload.`,
        };
    }

    if (!moment(value, "YYYY-MM-DD", true).isValid()) {
        return {
            error: "invalid_date",
            row: rowNumber,
            column: fieldName,
            value,
            message: `Invalid date "${value}" in column "${fieldName}" at row ${rowNumber}. The date does not exist on the calendar. Please correct it and re-upload.`,
        };
    }

    return undefined;
}

/**
 * Validates multiple date columns in a single row.
 * Returns all errors found; empty array if all valid.
 */
export function validateAllDateFieldsInRow(
    row: Record<string, string>,
    dateColumnNames: string[],
    rowNumber: number
): DateValidationError[] {
    return dateColumnNames.flatMap(colName => {
        const error = validateDateField(row[colName], colName, rowNumber);
        return error ? [error] : [];
    });
}

/**
 * Parses a known-valid ISO date string (YYYY-MM-DD) to a formatted date string.
 * Returns null if the value is absent or does not parse in strict mode.
 * Use this for internal date parsing after format validation has already passed.
 */
export function parseDateStrict(value: string | null | undefined): string | null {
    if (!value || value === "") return null;
    const m = moment(value, "YYYY-MM-DD", true);
    return m.isValid() ? m.format("YYYY-MM-DD") : null;
}
