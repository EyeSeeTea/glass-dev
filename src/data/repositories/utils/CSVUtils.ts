import Papa from "papaparse";
import { Readable } from "stream";

import { Row } from "../../../domain/repositories/SpreadsheetXlsxRepository";
import consoleLogger from "../../../utils/consoleLogger";

export const CSV_DEFAULT_CHUNK_SIZE = 300;

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
    return file.type.startsWith("text/csv") || ("name" in file && file.name.toLowerCase().endsWith(".csv"));
}

type CsvHeadersValidationResult = { valid: true } | { valid: false; missingHeaders: string[] };

/**
 * Validates that the required headers exist in the CSV file.
 * Reads only the first chunk of the CSV file for performance.
 */
export async function validateCsvHeaders(
    fileOrBlob: File | Blob,
    requiredHeaders: string[]
): Promise<CsvHeadersValidationResult> {
    return new Promise<CsvHeadersValidationResult>((resolve, reject) => {
        let isFirstChunk = true;
        let missingHeaders: string[] = [];
        const readable = createReadableInput(fileOrBlob);
        Papa.parse<Record<string, string>>(readable, {
            worker: true,
            header: true,
            skipEmptyLines: true,
            chunk: (results, parser) => {
                try {
                    if (isFirstChunk) {
                        consoleLogger.debug(`Validating CSV headers.`);
                        const headers = results.meta.fields || [];
                        missingHeaders = requiredHeaders.filter(col => !doesColumnExist(headers, col));

                        isFirstChunk = false;

                        resolve(missingHeaders.length > 0 ? { valid: false, missingHeaders } : { valid: true });
                        parser.abort();
                    }
                } catch (error) {
                    consoleLogger.error(`Error validating CSV headers: ${error}`);
                    reject(error);
                    parser.abort();
                }
            },
            complete: () => {
                consoleLogger.debug(
                    `Completed validating CSV headers. Missing headers: ${
                        missingHeaders.length > 0 ? missingHeaders.join(", ") : "none"
                    }`
                );
                resolve(missingHeaders.length > 0 ? { valid: false, missingHeaders } : { valid: true });
            },
            error: error => {
                consoleLogger.error(`Error validating CSV headers: ${error}`);
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
    fileOrBlob: File | Blob,
    columns: T
): Promise<SelectDistinctFromCsvResult<T>> {
    return new Promise<SelectDistinctFromCsvResult<T>>((resolve, reject) => {
        const result = new Map(columns.map(col => [col, new Set<string>()])) as Map<T[number], Set<string>>;
        let rowCount = 0;
        const readable = createReadableInput(fileOrBlob);

        Papa.parse<Record<string, string>>(readable, {
            worker: true,
            header: true,
            skipEmptyLines: true,
            chunk: (results, parser) => {
                try {
                    consoleLogger.debug(`Processing CSV chunk with ${results.data.length} rows.`);
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
                    consoleLogger.error(`Error processing CSV chunk: ${error}`);
                    reject(error);
                    parser.abort();
                }
            },
            complete: () => {
                consoleLogger.debug(`Completed processing CSV file with ${rowCount} rows.`);
                resolve({
                    rows: rowCount,
                    distinct: result,
                });
            },
            error: error => {
                consoleLogger.error(`Error processing CSV file: ${error}`);
                reject(error);
            },
        });
    });
}

/**
 * Parses a CSV Blob in chunks, transforming each row according to the provided dataColumns specification.
 * Processes the CSV file in chunks and calls the onChunk callback for each chunk.
 */
export async function parseCsvBlobInChunks<T>(
    dataColumns: Array<{ key: string; type: "string" | "number" }>,
    fileOrBlob: Blob | File,
    chunkSize = CSV_DEFAULT_CHUNK_SIZE,
    /** Callback to process each chunk. Return false to stop processing following chunks */
    onChunk: (chunk: T[]) => Promise<boolean>
): Promise<void> {
    consoleLogger.debug(`Starting to parse CSV in chunks of size ${chunkSize}.`);
    return new Promise<void>((resolve, reject) => {
        let currentChunk: T[] = [];
        let shouldContinue = true;
        const readable = createReadableInput(fileOrBlob);

        Papa.parse<Record<string, string>>(readable, {
            worker: true,
            header: true,
            skipEmptyLines: true,
            chunk: async (results, parser) => {
                try {
                    consoleLogger.debug(`Processing CSV chunk with ${results.data.length} rows.`);

                    if (!shouldContinue) {
                        consoleLogger.debug(`Processing has been stopped. Aborting parser.`);
                        parser.abort();
                        return;
                    }

                    // Transform CSV rows to the desired format
                    consoleLogger.debug(`Transforming CSV rows according to dataColumns specification.`);
                    const transformedRows = results.data.map(row => {
                        const data = dataColumns.map(column => {
                            if (column.type === "string") {
                                return {
                                    key: column.key,
                                    type: column.type,
                                    value: row[column.key] || "",
                                };
                            } else {
                                return {
                                    key: column.key,
                                    type: column.type,
                                    value: +(row[column.key] || 0),
                                };
                            }
                        });
                        return data as unknown as T;
                    });

                    consoleLogger.debug(`Adding ${transformedRows.length} transformed rows to current chunk.`);
                    currentChunk.push(...transformedRows);

                    // Process chunk if it reaches the desired size
                    if (currentChunk.length >= chunkSize) {
                        consoleLogger.debug(
                            `Current chunk size ${currentChunk.length} reached limit ${chunkSize}, processing chunk.`
                        );

                        parser.pause();

                        const chunkToProcess = currentChunk.slice(0, chunkSize);
                        currentChunk = currentChunk.slice(chunkSize);

                        shouldContinue = await onChunk(chunkToProcess);

                        if (!shouldContinue) {
                            consoleLogger.debug(`Processing stopped by onChunk callback. Aborting parser.`);
                            parser.abort();
                            resolve();
                            return;
                        }

                        consoleLogger.debug(`Resuming parser for next chunk.`);
                        parser.resume();
                    }
                } catch (error) {
                    consoleLogger.error(`Error processing CSV chunk: ${error}`);
                    parser.abort();
                    reject(error);
                }
            },
            complete: async () => {
                try {
                    // Process any remaining rows in chunks respecting the chunkSize limit
                    consoleLogger.debug(`Processing remaining rows in final chunks.`);
                    while (currentChunk.length > 0 && shouldContinue) {
                        const chunkToProcess = currentChunk.slice(0, chunkSize);
                        currentChunk = currentChunk.slice(chunkSize);
                        shouldContinue = await onChunk(chunkToProcess);
                        if (!shouldContinue) {
                            break;
                        }
                    }
                    consoleLogger.debug(`Completed processing remaining rows in final chunks.`);
                    resolve();
                } catch (error) {
                    consoleLogger.error(`Error processing final CSV chunk: ${error}`);
                    reject(error);
                }
            },
            error: error => {
                consoleLogger.error(`Error processing CSV file: ${error}`);
                reject(error);
            },
        });
    });
}

/**
 * Creates a readable input for Papa Parse based on the environment.
 * In Node.js, returns a true streaming ReadableStream from the blob.
 * In browser, returns the File directly.
 * If a Blob is provided in browser, throws an error.
 */
function createReadableInput(fileOrBlob: Blob | File): File | NodeJS.ReadableStream {
    const isNode = typeof process !== "undefined" && process.versions != null && process.versions.node != null;

    if (isNode) {
        // In Node.js, stream the blob in chunks to avoid OOM: chunks of 64 KB
        const chunkSize = 64 * 1024;
        let position = 0;
        const fileSize = fileOrBlob.size;

        const readable = new Readable({
            async read() {
                try {
                    if (position >= fileSize) {
                        this.push(null); // End of stream
                        return;
                    }

                    const end = Math.min(position + chunkSize, fileSize);
                    const slice = fileOrBlob.slice(position, end);
                    const arrayBuffer = await slice.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    position = end;
                    this.push(buffer);
                } catch (error) {
                    this.destroy(error as Error);
                }
            },
        });
        return readable;
    } else if (!(fileOrBlob instanceof global.File)) {
        throw new Error("In browser environment, input must be a File.");
    }

    return fileOrBlob;
}
