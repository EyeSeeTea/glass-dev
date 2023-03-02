import { RISData } from "../../domain/entities/data-entry/external/RISData";
import { Future, FutureData } from "../../domain/entities/Future";
import { RISDataRepository } from "../../domain/repositories/data-entry/RISDataRepository";
import { SpreadsheetXlsxDataSource } from "../../domain/repositories/SpreadsheetXlsxRepository";
import { getNumberValue, getTextValue } from "./utils/CSVUtils";

export class RISDataCSVRepository implements RISDataRepository {
    get(file: File): FutureData<RISData[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS

            return (
                sheet?.rows.map(row => {
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
                        BATCHID: getTextValue(row, "BATCHID"),
                        ABCLASS: getTextValue(row, "ABCLASS") || "ABCLASS",
                    };
                }) || []
            );
        });
    }
}
