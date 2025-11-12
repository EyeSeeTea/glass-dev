import { Row } from "../../../domain/repositories/SpreadsheetXlsxRepository";
import Papa from "papaparse";

export function getTextValue(row: Row<string>, column: string): string {
    return row[column] || "";
}

export function getNumberValue(row: Row<string>, column: string): number {
    return +(row[column] || 0);
}

export function doesColumnExist(header: string[], column: string): boolean {
    return header.includes(column);
}

export function isCsvFile(file: Blob | File): boolean {
    return file.type === "text/csv" || ("name" in file && file.name.toLowerCase().endsWith(".csv"));
}

type CsvHeadersValidationResult = { valid: true } | { valid: false; missingHeaders: string[] };

/**
 * Validates that the required headers exist in the CSV file.
 * Reads only the first chunk of the CSV file for performance.
 */
export async function validateCsvHeaders(file: File, requiredHeaders: string[]): Promise<CsvHeadersValidationResult> {
    return new Promise<CsvHeadersValidationResult>((resolve, reject) => {
        let isFirstChunk = true;
        let missingHeaders: string[] = [];
        Papa.parse<Record<string, string>>(file, {
            worker: true,
            header: true,
            skipEmptyLines: true,
            chunk: (results, parser) => {
                try {
                    if (isFirstChunk) {
                        const headers = results.meta.fields || [];
                        missingHeaders = requiredHeaders.filter(col => !doesColumnExist(headers, col));

                        isFirstChunk = false;

                        resolve(missingHeaders.length > 0 ? { valid: false, missingHeaders } : { valid: true });
                        parser.abort();
                    }
                } catch (error) {
                    reject(error);
                    parser.abort();
                }
            },
            complete: () => {
                resolve(missingHeaders.length > 0 ? { valid: false, missingHeaders } : { valid: true });
            },
            error: error => {
                reject(error);
            },
        });
    });
}

type SelectDistinctFromCsvResult<T extends string[]> = { rows: number; distinct: Map<T[number], Set<string>> };

/**
 * Returns the row count and distinct values for the specified columns from a CSV file.
 * Reads the entire CSV file in chunks for performance.
 */
export async function getRowCountAndSelectDistinctFromCsv<T extends string[]>(
    file: File,
    columns: T
): Promise<SelectDistinctFromCsvResult<T>> {
    return new Promise<SelectDistinctFromCsvResult<T>>((resolve, reject) => {
        const result = new Map(columns.map(col => [col, new Set<string>()])) as Map<T[number], Set<string>>;
        let rowCount = 0;
        Papa.parse<Record<string, string>>(file, {
            worker: true,
            header: true,
            skipEmptyLines: true,
            chunk: (results, parser) => {
                try {
                    for (const row of results.data) {
                        rowCount++;
                        for (const col of columns) {
                            const value = row[col];
                            if (value) {
                                result.get(col)?.add(value);
                            }
                        }
                    }
                } catch (error) {
                    reject(error);
                    parser.abort();
                }
            },
            complete: () => {
                resolve({
                    rows: rowCount,
                    distinct: result,
                });
            },
            error: error => {
                reject(error);
            },
        });
    });
}
