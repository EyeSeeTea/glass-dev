import { EGASPData } from "../../domain/entities/data-entry/EGASPData";
import { Future, FutureData } from "../../domain/entities/Future";
import { EGASPDataRepository } from "../../domain/repositories/data-entry/EGASPDataRepository";
import { SpreadsheetXlsxDataSource } from "../../domain/repositories/SpreadsheetXlsxRepository";
// import { SpreadsheetXlsxDataSource } from "../../domain/repositories/SpreadsheetXlsxRepository";
// import { doesColumnExist } from "./utils/CSVUtils";

export class EGASPDataCSVRepository implements EGASPDataRepository {
    get(file: File): FutureData<EGASPData[]> {
        console.debug(file);
        const egaspData: EGASPData[] = [];
        return Future.success(egaspData);
    }

    validate(file: File): FutureData<{ isValid: boolean; records: number; specimens: string[] }> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS
            const firstRow = sheet?.rows[0];
            if (firstRow) {
                return {
                    isValid: true,
                    records: sheet.rows.length - 2, //two rows for header
                    specimens: [],
                };
            } else
                return {
                    isValid: false,
                    records: 0,
                    specimens: [],
                };
        });
    }
}
