import _ from "lodash";
import * as XLSX from "xlsx";
import {
    Async,
    Row,
    Sheet,
    Spreadsheet,
    SpreadsheetDataSource,
} from "../../domain/repositories/SpreadsheetXlsxRepository";

// READ_OPTIONS_NOTE: we read with { raw: true } (not { cellDates: true }) so every cell is kept
// as the literal text the user typed. cellDates coerces date-like cells into JS Date objects, which
// (a) breaks the ISO date-format validation (a Date stringifies to "Wed Oct 09 2024 ...") and
// (b) shifts the calendar day depending on the runtime timezone. Downstream readers (getNumberValue,
// getTextValue) tolerate string values, so this is safe for every module that uses this data source.
export class SpreadsheetXlsxDataSource implements SpreadsheetDataSource {
    async read(inputFile: File): Async<Spreadsheet> {
        try {
            const arrayBuffer = await inputFile.arrayBuffer();
            return this.readFromArrayBuffer(arrayBuffer, inputFile.name);
        } catch (e) {
            return { name: "", sheets: [] };
        }
    }

    async readFromArrayBuffer(arrayBuffer: ArrayBuffer, fileName?: string): Async<Spreadsheet> {
        try {
            const workbook = XLSX.read(arrayBuffer, { raw: true }); // see READ_OPTIONS_NOTE below

            const sheets = _(workbook.Sheets)
                .toPairs()
                .map(([sheetName, worksheet]): Sheet => {
                    const headers = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: "" })[0] || [];
                    const rows = XLSX.utils.sheet_to_json<Row<string>>(worksheet, { raw: true, skipHidden: false });

                    return {
                        name: sheetName,
                        headers,
                        rows,
                    };
                })
                .value();

            const spreadsheet: Spreadsheet = {
                name: fileName || "spreadsheet.xlsx",
                sheets,
            };

            return spreadsheet;
        } catch (e) {
            return { name: "", sheets: [] };
        }
    }

    async readFromBlob(blob: Blob, fileName?: string): Async<Spreadsheet> {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            return this.readFromArrayBuffer(arrayBuffer, fileName || "");
        } catch (e) {
            return { name: "", sheets: [] };
        }
    }
}
