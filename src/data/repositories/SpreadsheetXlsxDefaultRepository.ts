import _ from "lodash";
import * as XLSX from "xlsx";
import Papa, { ParseResult } from "papaparse";

import {
    Async,
    Row,
    Sheet,
    Spreadsheet,
    SpreadsheetDataSource,
} from "../../domain/repositories/SpreadsheetXlsxRepository";
import consoleLogger from "../../utils/consoleLogger";

export const CSV_DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;

export class SpreadsheetXlsxDataSource implements SpreadsheetDataSource {
    async read(inputFile: File): Async<Spreadsheet> {
        try {
            const workbook = XLSX.read(await inputFile?.arrayBuffer(), { cellDates: true });

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
                name: inputFile.name,
                sheets,
            };

            return spreadsheet;
        } catch (e) {
            return { name: "", sheets: [] };
        }
    }

    async readFromArrayBuffer(arrayBuffer: ArrayBuffer, fileName?: string): Async<Spreadsheet> {
        try {
            const workbook = XLSX.read(arrayBuffer, { cellDates: true });

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
                name: fileName || "",
                sheets,
            };

            return spreadsheet;
        } catch (e) {
            return { name: "", sheets: [] };
        }
    }

    async readFromBlob(blob: Blob, fileName?: string): Async<Spreadsheet> {
        try {
            const workbook = XLSX.read(await blob?.arrayBuffer(), { cellDates: true });

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
                name: fileName || "",
                sheets,
            };

            return spreadsheet;
        } catch (e) {
            return { name: "", sheets: [] };
        }
    }

    async parseCsvToSpreadsheet(file: File, chunkSize = CSV_DEFAULT_CHUNK_SIZE): Promise<Spreadsheet> {
        return new Promise<Spreadsheet>(resolve => {
            const rows: Row<string>[] = [];
            let headers: string[] = [];
            let processedBytes = 0;

            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                worker: true,
                chunkSize,

                chunk: (results: ParseResult<Record<string, unknown>>) => {
                    if (!headers.length) {
                        headers = (results.meta.fields ?? []).map(header => header.trim());
                    }

                    for (const row of results.data) {
                        const normalized: Record<string, string> = {};
                        for (const header of headers) {
                            const value = row[header];
                            normalized[header] = value == null ? "" : String(value);
                        }
                        rows.push(normalized);
                    }

                    processedBytes += chunkSize;

                    const percent = file.size ? Math.min(100, (processedBytes / file.size) * 100) : 100;
                    consoleLogger.debug(`CSV Parsing progress: ${percent.toFixed(2)}%`);
                },

                complete: () => {
                    resolve({
                        name: file.name,
                        sheets: [
                            {
                                name: `${file.name}-sheet`,
                                headers: headers,
                                rows: rows,
                            },
                        ],
                    });
                },

                error: err => {
                    consoleLogger.error(`Error parsing CSV: ${err}`);
                    resolve({ name: "", sheets: [] });
                },
            });
        });
    }
}
