import { EGASPData } from "../../domain/entities/data-entry/EGASPData";
import { Future, FutureData } from "../../domain/entities/Future";
import { EGASPDataRepository } from "../../domain/repositories/data-entry/EGASPDataRepository";
// import { SpreadsheetXlsxDataSource } from "../../domain/repositories/SpreadsheetXlsxRepository";
// import { doesColumnExist } from "./utils/CSVUtils";

export class EGASPDataCSVRepository implements EGASPDataRepository {
    get(file: File): FutureData<EGASPData[]> {
        // return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
        //     const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS

        //     return (
        //         sheet?.rows.map(row => {
        //             return {
        //                 COUNTRY: getTextValue(row, "COUNTRY"),
        //                 YEAR: getNumberValue(row, "YEAR"),
        //                 SPECIMEN: getTextValue(row, "SPECIMEN"),
        //                 PATHOGEN: getTextValue(row, "PATHOGEN"),
        //                 GENDER: getTextValue(row, "GENDER"),
        //                 ORIGIN: getTextValue(row, "ORIGIN"),
        //                 AGEGROUP: getTextValue(row, "AGEGROUP"),
        //                 ANTIBIOTIC: getTextValue(row, "ANTIBIOTIC"),
        //                 RESISTANT: getNumberValue(row, "RESISTANT"),
        //                 INTERMEDIATE: getNumberValue(row, "INTERMEDIATE"),
        //                 NONSUSCEPTIBLE: getNumberValue(row, "NONSUSCEPTIBLE"),
        //                 SUSCEPTIBLE: getNumberValue(row, "SUSCEPTIBLE"),
        //                 UNKNOWN_NO_AST: getNumberValue(row, "UNKNOWN_NO_AST"),
        //                 UNKNOWN_NO_BREAKPOINTS: getNumberValue(row, "UNKNOWN_NO_BREAKPOINTS"),
        //                 BATCHIDDS: getTextValue(row, "BATCHID"),
        //                 ABCLASS: this.validateABCLASS(getTextValue(row, "ABCLASS")),
        //             };
        //         }) || []
        //     );
        // });
        console.debug(file);
        const egaspData: EGASPData[] = [];
        return Future.success(egaspData);
    }

    validate(file: File): FutureData<{ isValid: boolean; records: number; specimens: string[] }> {
        // return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
        //     const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS
        //     const firstRow = sheet?.rows[0];
        //     if (firstRow) {
        //         const allRISColsPresent =
        //             doesColumnExist(firstRow, "COUNTRY") &&
        //             doesColumnExist(firstRow, "YEAR") &&
        //             doesColumnExist(firstRow, "SPECIMEN") &&
        //             doesColumnExist(firstRow, "PATHOGEN") &&
        //             doesColumnExist(firstRow, "GENDER") &&
        //             doesColumnExist(firstRow, "ORIGIN") &&
        //             doesColumnExist(firstRow, "AGEGROUP") &&
        //             doesColumnExist(firstRow, "ANTIBIOTIC") &&
        //             doesColumnExist(firstRow, "RESISTANT") &&
        //             doesColumnExist(firstRow, "INTERMEDIATE") &&
        //             doesColumnExist(firstRow, "NONSUSCEPTIBLE") &&
        //             doesColumnExist(firstRow, "SUSCEPTIBLE") &&
        //             doesColumnExist(firstRow, "UNKNOWN_NO_AST") &&
        //             doesColumnExist(firstRow, "UNKNOWN_NO_BREAKPOINTS") &&
        //             doesColumnExist(firstRow, "BATCHID");
        //         const uniqSpecimens = _(sheet.rows)
        //             .uniqBy("SPECIMEN")
        //             .value()
        //             .map(row => (row["SPECIMEN"] ? row["SPECIMEN"] : ""));
        //         return {
        //             isValid: allRISColsPresent ? true : false,
        //             records: sheet.rows.length,
        //             specimens: uniqSpecimens,
        //         };
        //     } else
        //         return {
        //             isValid: false,
        //             records: 0,
        //             specimens: [],
        //         };
        // });

        console.debug(file);
        return Future.success({
            isValid: true,
            records: 0,
            specimens: [],
        });
    }
}
