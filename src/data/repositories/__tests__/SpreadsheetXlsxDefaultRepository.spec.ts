import { SpreadsheetXlsxDataSource } from "../SpreadsheetXlsxDefaultRepository";

// XLSX.read auto-detects a Node Buffer reliably under jest's jsdom env, whereas a bare ArrayBuffer
// is not picked up there (a SheetJS environment-detection quirk; the real browser app passes a
// File.arrayBuffer() that works fine). readFromArrayBuffer forwards its argument straight to
// XLSX.read, so handing it a Buffer exercises the same code path.
function csvToArrayBuffer(csv: string): ArrayBuffer {
    return Buffer.from(csv, "utf8") as unknown as ArrayBuffer;
}

describe("SpreadsheetXlsxDataSource date handling", () => {
    it("keeps ISO date cells as literal YYYY-MM-DD strings (no JS Date coercion)", async () => {
        const csv = ["SAMPLE_DATE,SPECIMEN", "2024-10-09,BLOOD"].join("\n");

        const spreadsheet = await new SpreadsheetXlsxDataSource().readFromArrayBuffer(csvToArrayBuffer(csv));
        const value: unknown = spreadsheet.sheets[0]?.rows[0]?.["SAMPLE_DATE"];

        // A literal string, not a coerced Date object (a Date would be typeof "object").
        expect(typeof value).toBe("string");
        expect(value).toBe("2024-10-09");
    });

    it("keeps non-ISO date cells as their literal text so format validation can flag them", async () => {
        const csv = ["SAMPLE_DATE,SPECIMEN", "8/5/2024,BLOOD"].join("\n");

        const spreadsheet = await new SpreadsheetXlsxDataSource().readFromArrayBuffer(csvToArrayBuffer(csv));
        const value: unknown = spreadsheet.sheets[0]?.rows[0]?.["SAMPLE_DATE"];

        // A literal string, not a coerced Date object (a Date would be typeof "object").
        expect(typeof value).toBe("string");
        expect(value).toBe("8/5/2024");
    });
});
