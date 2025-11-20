import { Future, FutureData } from "../../../domain/entities/Future";
import {
    CustomDataColumns,
    CustomDataElementNumber,
    CustomDataElementString,
} from "../../../domain/entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { SpreadsheetXlsxDataSource } from "../SpreadsheetXlsxDefaultRepository";
import { doesColumnExist, getNumberValue, getTextValue } from "../utils/CSVUtils";
import { RISIndividualFungalDataRepository } from "../../../domain/repositories/data-entry/RISIndividualFungalDataRepository";
import { ValidationResultWithSpecimens } from "../../../domain/entities/FileValidationResult";
import {
    isCsvFile,
    validateCsvHeaders,
    getRowCountAndSelectDistinctFromCsv,
    parseCsvBlobInChunks,
} from "../utils/CSVUtils";
import _ from "lodash";
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

    validate(dataColumns: CustomDataColumns, file: File | Blob): FutureData<ValidationResultWithSpecimens> {
        if (isCsvFile(file)) {
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

    private validateCsv(file: File | Blob, requiredColumns: string[]): FutureData<ValidationResultWithSpecimens> {
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
        }

        // For Excel files, fall back to loading all at once and chunking manually
        return this.getFromBlob(dataColumns, blob).flatMap(allRows => {
            const chunks = _.chunk(allRows, chunkSize);
            const processChunk = (index: number): FutureData<void> => {
                if (index >= chunks.length) {
                    return Future.success(undefined);
                }
                const chunk = chunks[index];
                if (!chunk) {
                    return Future.success(undefined);
                }
                return onChunk(chunk).flatMap(shouldContinue => {
                    if (!shouldContinue) {
                        return Future.success(undefined);
                    }
                    return processChunk(index + 1);
                });
            };
            return processChunk(0);
        });
    }
}
