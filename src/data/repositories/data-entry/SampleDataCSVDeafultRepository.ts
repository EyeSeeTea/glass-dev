import { SampleData } from "../../../domain/entities/data-entry/amr-external/SampleData";
import { Future, FutureData } from "../../../domain/entities/Future";
import { SampleDataRepository } from "../../../domain/repositories/data-entry/SampleDataRepository";
import { Row } from "../../../domain/repositories/SpreadsheetXlsxRepository";
import { SpreadsheetXlsxDataSource } from "../SpreadsheetXlsxDefaultRepository";
import { doesColumnExist, getNumberValue, getTextValue } from "../utils/CSVUtils";

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
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS
            const headerRow = sheet?.headers;

            if (headerRow) {
                const allSampleColsPresent =
                    doesColumnExist(headerRow, "COUNTRY") &&
                    doesColumnExist(headerRow, "YEAR") &&
                    doesColumnExist(headerRow, "SPECIMEN") &&
                    doesColumnExist(headerRow, "GENDER") &&
                    doesColumnExist(headerRow, "ORIGIN") &&
                    doesColumnExist(headerRow, "AGEGROUP") &&
                    // doesColumnExist(firstRow, "NUMINFECTED") &&
                    doesColumnExist(headerRow, "NUMSAMPLEDPATIENTS") &&
                    doesColumnExist(headerRow, "BATCHID");

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
}
