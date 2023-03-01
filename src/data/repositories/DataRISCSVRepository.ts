import { RISData } from "../../domain/entities/data-entry/RISData";
import { Future, FutureData } from "../../domain/entities/Future";
import { Row, SpreadsheetXlsxDataSource } from "../../domain/repositories/SpreadsheetXlsxRepository";

export class RISDataRepository {
    get(file: File): FutureData<RISData[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS

            return (
                sheet?.rows.map(row => {
                    return {
                        COUNTRY: this.getTextValue(row, "COUNTRY"),
                        YEAR: this.getNumberValue(row, "YEAR"),
                        SPECIMEN: this.getTextValue(row, "SPECIMEN"),
                        PATHOGEN: this.getTextValue(row, "PATHOGEN"),
                        GENDER: this.getTextValue(row, "GENDER"),
                        ORIGIN: this.getTextValue(row, "ORIGIN"),
                        AGEGROUP: this.getTextValue(row, "AGEGROUP"),
                        ANTIBIOTIC: this.getTextValue(row, "ANTIBIOTIC"),
                        RESISTANT: this.getNumberValue(row, "RESISTANT"),
                        INTERMEDIATE: this.getNumberValue(row, "INTERMEDIATE"),
                        NONSUSCEPTIBLE: this.getNumberValue(row, "NONSUSCEPTIBLE"),
                        SUSCEPTIBLE: this.getNumberValue(row, "SUSCEPTIBLE"),
                        UNKNOWN_NO_AST: this.getNumberValue(row, "UNKNOWN_NO_AST"),
                        UNKNOWN_NO_BREAKPOINTS: this.getNumberValue(row, "UNKNOWN_NO_BREAKPOINTS"),
                        BATCHID: this.getTextValue(row, "BATCHID"),
                        ABCLASS: this.getTextValue(row, "ABCLASS") || "ABCLASS",
                    };
                }) || []
            );
        });
    }

    private getTextValue(row: Row<string>, column: string): string {
        return row[column] || "";
    }

    private getNumberValue(row: Row<string>, column: string): number {
        return +(row[column] || 0);
    }
}
