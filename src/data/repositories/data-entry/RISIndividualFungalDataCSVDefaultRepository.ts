import { Future, FutureData } from "../../../domain/entities/Future";
import {
    CustomDataColumns,
    CustomDataElementNumber,
    CustomDataElementString,
} from "../../../domain/entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { SpreadsheetXlsxDataSource } from "../SpreadsheetXlsxDefaultRepository";
import {
    doesColumnExist,
    getNumberValue,
    getRowCountAndSelectDistinctFromCsv,
    getTextValue,
    isCsvFile,
    parseCsvBlobInChunks,
    validateCsvHeaders,
} from "../utils/CSVUtils";
import { RISIndividualFungalDataRepository } from "../../../domain/repositories/data-entry/RISIndividualFungalDataRepository";
import consoleLogger from "../../../utils/consoleLogger";

// AMR - INDIVIDUAL and AMR - FUNGAL MODULE: RIS INDIVIDUAL & FUNGAL DATA FILE
export class RISIndividualFungalDataCSVDefaultRepository implements RISIndividualFungalDataRepository {
    get(dataColumns: CustomDataColumns, file: File): FutureData<CustomDataColumns[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR Individual & Fungal

            const rows: CustomDataColumns[] =
                sheet?.rows.map(row => {
                    const data: CustomDataColumns = dataColumns.map(column => {
                        if (column.type === "string")
                            return {
                                key: column.key,
                                type: column.type,
                                value: getTextValue(row, column.key),
                            } as CustomDataElementString;
                        else
                            return {
                                key: column.key,
                                type: column.type,
                                value: getNumberValue(row, column.key),
                            } as CustomDataElementNumber;
                    });
                    return data;
                }) || [];
            return rows;
        });
    }

    validate(
        dataColumns: CustomDataColumns,
        file: File | Blob
    ): FutureData<{ isValid: boolean; specimens: string[]; rows: number }> {
        if (isCsvFile(file)) {
            consoleLogger.debug("Validating CSV file");
            return this.validateCsv(
                file,
                dataColumns.map(col => col.key)
            );
        }

        const readPromise = new SpreadsheetXlsxDataSource().readFromBlob(file);
        return Future.fromPromise(readPromise).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS

            const headerRow = sheet?.headers;

            if (headerRow) {
                const allRISIndividualFungalColsPresent = dataColumns.every(col => doesColumnExist(headerRow, col.key));

                const uniqSpecimens = _(sheet.rows)
                    .uniqBy("SPECIMEN")
                    .value()
                    .map(row => (row["SPECIMEN"] ? row["SPECIMEN"] : ""));

                return {
                    isValid: allRISIndividualFungalColsPresent ? true : false,
                    rows: sheet.rows.length,
                    specimens: uniqSpecimens,
                };
            } else
                return {
                    isValid: false,
                    rows: 0,
                    specimens: [],
                };
        });
    }

    private validateCsv(
        file: File | Blob,
        requiredColumns: string[]
    ): FutureData<{ isValid: boolean; specimens: string[]; rows: number }> {
        return Future.fromPromise(
            validateCsvHeaders(file, requiredColumns).then(headerValidationResult => {
                if (!headerValidationResult.valid) {
                    return {
                        isValid: false,
                        rows: 0,
                        specimens: [],
                    };
                }
                return getRowCountAndSelectDistinctFromCsv(file, ["SPECIMEN"]).then(distinctResult => {
                    return {
                        isValid: true,
                        rows: distinctResult.rows,
                        specimens: Array.from(distinctResult.distinct.get("SPECIMEN") || []),
                    };
                });
            })
        );
    }

    getFromBlob(dataColumns: CustomDataColumns, blob: Blob): FutureData<CustomDataColumns[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().readFromBlob(blob)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR Individual & Fungal

            const rows: CustomDataColumns[] =
                sheet?.rows.map(row => {
                    const data: CustomDataColumns = dataColumns.map(column => {
                        if (column.type === "string")
                            return {
                                key: column.key,
                                type: column.type,
                                value: getTextValue(row, column.key),
                            } as CustomDataElementString;
                        else
                            return {
                                key: column.key,
                                type: column.type,
                                value: getNumberValue(row, column.key),
                            } as CustomDataElementNumber;
                    });
                    return data;
                }) || [];
            return rows;
        });
    }

    getFromBlobInChunks(
        dataColumns: CustomDataColumns,
        blob: Blob,
        chunkSize: number,
        onChunk: (chunk: CustomDataColumns[]) => FutureData<boolean>
    ): FutureData<void> {
        if (isCsvFile(blob)) {
            return Future.fromPromise(
                parseCsvBlobInChunks<CustomDataColumns>(dataColumns, blob, chunkSize, (chunk: CustomDataColumns[]) =>
                    onChunk(chunk).toPromise()
                )
            );
        } else {
            // xlsx (and other non-CSV) files are not streamed: read the whole file into memory as before,
            // then hand the rows to the caller in chunkSize slices so it gets the same chunked contract as CSV.
            consoleLogger.debug("Non-CSV file detected: reading it fully into memory before chunking rows.");
            return this.getFromBlob(dataColumns, blob).flatMap(rows => this.emitRowsInChunks(rows, chunkSize, onChunk));
        }
    }

    private emitRowsInChunks(
        rows: CustomDataColumns[],
        chunkSize: number,
        onChunk: (chunk: CustomDataColumns[]) => FutureData<boolean>
    ): FutureData<void> {
        const chunk = rows.slice(0, chunkSize);
        if (chunk.length === 0) return Future.success(undefined);

        const remainingRows = rows.slice(chunkSize);
        return onChunk(chunk).flatMap(shouldContinue => {
            if (!shouldContinue) return Future.success(undefined);
            return this.emitRowsInChunks(remainingRows, chunkSize, onChunk);
        });
    }
}
