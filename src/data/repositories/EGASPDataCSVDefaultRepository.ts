import { Future, FutureData } from "../../domain/entities/Future";
import { EGASPDataRepository } from "../../domain/repositories/data-entry/EGASPDataRepository";
import { SpreadsheetXlsxDataSource } from "./SpreadsheetXlsxDefaultRepository";

export class EGASPDataCSVDefaultRepository implements EGASPDataRepository {
    validate(
        file: File,
        dataColumns: string[]
    ): FutureData<{ isValid: boolean; records: number; specimens: string[] }> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //First sheet has data for EGASP
            const headerRow = sheet?.rows[1]; //The second row has header deyails for EGASP template.
            if (headerRow) {
                const sanitizedHeaders = Object.values(headerRow).map(header => header.replace(/[* \n\r]/g, ""));
                const allEGASPCols = dataColumns.map(col => sanitizedHeaders.includes(col));
                const allEGASPColsPresent = _.every(allEGASPCols, c => c === true);

                return {
                    isValid: allEGASPColsPresent ? true : false,
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
