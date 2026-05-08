import { SampleData } from "../../../domain/entities/data-entry/amr-external/SampleData";
import { Future, FutureData } from "../../../domain/entities/Future";
import { SampleDataRepository } from "../../../domain/repositories/data-entry/SampleDataRepository";
import { Row } from "../../../domain/repositories/SpreadsheetXlsxRepository";
import { SpreadsheetXlsxDataSource } from "../SpreadsheetXlsxDefaultRepository";
import {
    doesColumnExist,
    getNumberValue,
    getRowCountAndSelectDistinctFromCsv,
    getTextValue,
    isCsvFile,
    validateCsvHeaders,
} from "../utils/CSVUtils";

// AMR and AMR - INDIVIDUAL MODULE: SAMPLE DATA FILE
export class SampleDataCSVDeafultRepository implements SampleDataRepository {
    get(file: File): FutureData<SampleData[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS
            return this.mapSheetRowsToSampleData(sheet?.rows || []);
        });
    }

    getFromArrayBuffer(arrayBuffer: ArrayBuffer): FutureData<SampleData[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().readFromArrayBuffer(arrayBuffer)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS
            return this.mapSheetRowsToSampleData(sheet?.rows || []);
        });
    }

    getFromBlob(blob: Blob): FutureData<SampleData[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().readFromBlob(blob)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS
            return this.mapSheetRowsToSampleData(sheet?.rows || []);
        });
    }

    private mapSheetRowsToSampleData(rows: Row<string>[]): SampleData[] {
        return rows.map(row => {
            return {
                COUNTRY: getTextValue(row, "COUNTRY"),
                YEAR: getNumberValue(row, "YEAR"),
                SPECIMEN: getTextValue(row, "SPECIMEN"),
                GENDER: getTextValue(row, "GENDER"),
                ORIGIN: getTextValue(row, "ORIGIN"),
                AGEGROUP: getTextValue(row, "AGEGROUP"),
                NUMINFECTED: getNumberValue(row, "NUMINFECTED"),
                NUMSAMPLEDPATIENTS: getNumberValue(row, "NUMSAMPLEDPATIENTS"),
                BATCHIDDS: getTextValue(row, "BATCHID"),
            };
        });
    }

    validate(file: File): FutureData<{ isValid: boolean; rows: number }> {
        const requiredColumns = [
            "COUNTRY",
            "YEAR",
            "SPECIMEN",
            "GENDER",
            "ORIGIN",
            "AGEGROUP",
            "NUMSAMPLEDPATIENTS",
            "BATCHID",
        ];
        if (isCsvFile(file)) {
            return this.validateCsv(file, requiredColumns);
        }

        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS
            const headerRow = sheet?.headers;

            if (headerRow) {
                const allSampleColsPresent = requiredColumns.every(col => doesColumnExist(headerRow, col));

                return {
                    isValid: allSampleColsPresent ? true : false,
                    rows: sheet.rows.length,
                };
            } else
                return {
                    isValid: false,
                    rows: 0,
                };
        });
    }

    private validateCsv(file: File, requiredColumns: string[]): FutureData<{ isValid: boolean; rows: number }> {
        return Future.fromPromise(
            validateCsvHeaders(file, requiredColumns).then(headerValidationResult => {
                if (!headerValidationResult.valid) {
                    return {
                        isValid: false,
                        rows: 0,
                    };
                } else {
                    return getRowCountAndSelectDistinctFromCsv(file, []).then(distinctResult => {
                        return {
                            isValid: true,
                            rows: distinctResult.rows,
                        };
                    });
                }
            })
        );
    }
}
