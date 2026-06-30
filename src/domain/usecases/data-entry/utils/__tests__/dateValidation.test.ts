import { validateAllDateFieldsInRow, validateDateField } from "../dateValidation";

describe("validateDateField", () => {
    // ---- skip cases ----
    it("returns undefined for empty string", () => {
        expect(validateDateField("", "MY_DATE", 1)).toBeUndefined();
    });

    it("returns undefined for null", () => {
        expect(validateDateField(null, "MY_DATE", 1)).toBeUndefined();
    });

    it("returns undefined for undefined", () => {
        expect(validateDateField(undefined, "MY_DATE", 1)).toBeUndefined();
    });

    // ---- valid ISO dates ----
    it("returns undefined for a valid ISO date", () => {
        expect(validateDateField("2024-09-23", "MY_DATE", 1)).toBeUndefined();
    });

    it("returns undefined for a valid leap-year date", () => {
        expect(validateDateField("2024-02-29", "MY_DATE", 1)).toBeUndefined();
    });

    // ---- wrong format: date_format errors ----
    it("returns date_format error for DD/MM/YYYY", () => {
        const result = validateDateField("23/09/2024", "SAMPLE_DATE", 5);
        expect(result).toBeDefined();
        expect(result?.error).toBe("date_format");
        expect(result?.row).toBe(5);
        expect(result?.column).toBe("SAMPLE_DATE");
        expect(result?.value).toBe("23/09/2024");
        expect(result?.message).toContain("23/09/2024");
        expect(result?.message).toContain("SAMPLE_DATE");
        expect(result?.message).toContain("row 5");
        expect(result?.message).toContain("YYYY-MM-DD");
    });

    it("returns date_format error for MM/DD/YYYY", () => {
        const result = validateDateField("09/23/2024", "SAMPLE_DATE", 3);
        expect(result?.error).toBe("date_format");
    });

    it("returns date_format error for DD-MM-YYYY", () => {
        const result = validateDateField("23-09-2024", "SAMPLE_DATE", 2);
        expect(result?.error).toBe("date_format");
    });

    it("returns date_format error for slash-separated ISO-ish (YYYY/MM/DD)", () => {
        const result = validateDateField("2024/09/23", "SAMPLE_DATE", 7);
        expect(result?.error).toBe("date_format");
    });

    it("returns date_format error for a random string", () => {
        const result = validateDateField("hello", "MY_DATE", 1);
        expect(result?.error).toBe("date_format");
    });

    // ---- right format but impossible calendar date: invalid_date errors ----
    it("returns invalid_date error for a non-leap-year February 29", () => {
        const result = validateDateField("2025-02-29", "SAMPLE_DATE", 10);
        expect(result).toBeDefined();
        expect(result?.error).toBe("invalid_date");
        expect(result?.row).toBe(10);
        expect(result?.column).toBe("SAMPLE_DATE");
        expect(result?.value).toBe("2025-02-29");
        expect(result?.message).toContain("2025-02-29");
        expect(result?.message).toContain("does not exist on the calendar");
    });

    it("returns invalid_date error for an impossible date (month 13)", () => {
        const result = validateDateField("2024-13-45", "MY_DATE", 1);
        expect(result?.error).toBe("invalid_date");
    });

    // ---- row number appears in messages ----
    it("includes the row number in the error message", () => {
        const result = validateDateField("23/09/2024", "COL", 42);
        expect(result?.message).toContain("row 42");
        expect(result?.row).toBe(42);
    });
});

describe("validateAllDateFieldsInRow", () => {
    it("returns empty array when all date fields are valid", () => {
        const row = { START_DATE: "2024-01-15", END_DATE: "2024-06-30" };
        const errors = validateAllDateFieldsInRow(row, ["START_DATE", "END_DATE"], 1);
        expect(errors).toHaveLength(0);
    });

    it("returns empty array when date fields are absent from the row", () => {
        const row = { OTHER_COL: "some value" };
        const errors = validateAllDateFieldsInRow(row, ["START_DATE"], 1);
        expect(errors).toHaveLength(0);
    });

    it("returns errors only for invalid date fields", () => {
        const row = { GOOD_DATE: "2024-09-23", BAD_DATE: "23/09/2024" };
        const errors = validateAllDateFieldsInRow(row, ["GOOD_DATE", "BAD_DATE"], 3);
        expect(errors).toHaveLength(1);
        expect(errors[0]?.column).toBe("BAD_DATE");
        expect(errors[0]?.error).toBe("date_format");
        expect(errors[0]?.row).toBe(3);
    });

    it("returns errors for multiple invalid date fields in the same row", () => {
        const row = { DATE_A: "23/09/2024", DATE_B: "2025-02-29" };
        const errors = validateAllDateFieldsInRow(row, ["DATE_A", "DATE_B"], 7);
        expect(errors).toHaveLength(2);
        expect(errors.map(e => e.column)).toContain("DATE_A");
        expect(errors.map(e => e.column)).toContain("DATE_B");
    });

    it("includes correct row number in each error", () => {
        const row = { COL: "bad-format" };
        const errors = validateAllDateFieldsInRow(row, ["COL"], 99);
        expect(errors[0]?.row).toBe(99);
    });
});
