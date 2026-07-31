import { RISData } from "../../../domain/entities/data-entry/amr-external/RISData";
import { Future, FutureData } from "../../../domain/entities/Future";
import { RISDataRepository } from "../../../domain/repositories/data-entry/RISDataRepository";
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

// AMR MODULE: RIS DATA FILE
export class RISDataCSVDefaultRepository implements RISDataRepository {
    get(file: File): FutureData<RISData[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS
            return this.mapSheetRowsToRISData(sheet?.rows || []);
        });
    }

    getFromArrayBuffer(arrayBuffer: ArrayBuffer): FutureData<RISData[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().readFromArrayBuffer(arrayBuffer)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS
            return this.mapSheetRowsToRISData(sheet?.rows || []);
        });
    }

    private mapSheetRowsToRISData(rows: Row<string>[]): RISData[] {
        return rows.map(row => {
            return {
                COUNTRY: getTextValue(row, "COUNTRY"),
                YEAR: getNumberValue(row, "YEAR"),
                SPECIMEN: getTextValue(row, "SPECIMEN"),
                PATHOGEN: getTextValue(row, "PATHOGEN"),
                GENDER: getTextValue(row, "GENDER"),
                ORIGIN: getTextValue(row, "ORIGIN"),
                AGEGROUP: getTextValue(row, "AGEGROUP"),
                ANTIBIOTIC: getTextValue(row, "ANTIBIOTIC"),
                RESISTANT: getNumberValue(row, "RESISTANT"),
                INTERMEDIATE: getNumberValue(row, "INTERMEDIATE"),
                NONSUSCEPTIBLE: getNumberValue(row, "NONSUSCEPTIBLE"),
                SUSCEPTIBLE: getNumberValue(row, "SUSCEPTIBLE"),
                UNKNOWN_NO_AST: getNumberValue(row, "UNKNOWN_NO_AST"),
                UNKNOWN_NO_BREAKPOINTS: getNumberValue(row, "UNKNOWN_NO_BREAKPOINTS"),
                BATCHIDDS: getTextValue(row, "BATCHID"),
                ABCLASS: this.validateABCLASS(getTextValue(row, "ABCLASS")),
            };
        });
    }

    validate(file: File): FutureData<{ isValid: boolean; specimens: string[]; rows: number }> {
        const requiredColumns = [
            "COUNTRY",
            "YEAR",
            "SPECIMEN",
            "PATHOGEN",
            "GENDER",
            "ORIGIN",
            "AGEGROUP",
            "ANTIBIOTIC",
            "RESISTANT",
            "INTERMEDIATE",
            "NONSUSCEPTIBLE",
            "SUSCEPTIBLE",
            "UNKNOWN_NO_AST",
            "UNKNOWN_NO_BREAKPOINTS",
            "BATCHID",
        ];

        if (isCsvFile(file)) {
            return this.validateCsv(file, requiredColumns);
        }

        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS
            const headerRow = sheet?.headers;

            if (headerRow) {
                const allRISColsPresent = requiredColumns.every(col => doesColumnExist(headerRow, col));

                const uniqSpecimens = _(sheet.rows)
                    .uniqBy("SPECIMEN")
                    .value()
                    .map(row => (row["SPECIMEN"] ? row["SPECIMEN"] : ""));

                return {
                    isValid: allRISColsPresent ? true : false,
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
        file: File,
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

    validateABCLASS(absClass: string) {
        //TODO: Remove this function when ABCLASS bring value from the file
        //ABCLASS is not in the file for the moment, if value is empty
        // set ABCLASS Missing
        return absClass || "ABCLASS Missing";
    }
}
