import { Future, FutureData } from "../../../domain/entities/Future";
import { AMCDataRepository } from "../../../domain/repositories/data-entry/AMCDataRepository";
import { SpreadsheetXlsxDataSource } from "../SpreadsheetXlsxDefaultRepository";

export class AMCProductDataRepository implements AMCDataRepository {
    validate(
        file: File,
        rawProductDataColumns: string[],
        teiDataColumns: string[]
    ): FutureData<{ isValid: boolean; rows: number; specimens: string[] }> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const teiSheet = spreadsheet.sheets[0]; //First sheet is tracked entity instance data
            const teiHeaderRow = teiSheet?.rows[0]; //The second row has header details for AMC template.

            const rawProductSheet = spreadsheet.sheets[1]; //Second sheet is raw product level data
            const rawProductHeaderRow = rawProductSheet?.rows[0];

            if (rawProductHeaderRow && teiHeaderRow) {
                const sanitizedRawProductHeaders = Object.values(rawProductHeaderRow).map(header =>
                    header.replace(/[* \n\r]/g, "")
                );
                const allRawProductCols = rawProductDataColumns.map(col => sanitizedRawProductHeaders.includes(col));
                const allRawProductColsPresent = _.every(allRawProductCols, c => c === true);

                const sanitizedTEIHeaders = Object.values(teiHeaderRow).map(header => header.replace(/[* \n\r]/g, ""));
                const allTEICols = teiDataColumns.map(col => sanitizedTEIHeaders.includes(col));
                const allTEIColsPresent = _.every(allTEICols, c => c === true);

                return {
                    isValid: allRawProductColsPresent && allTEIColsPresent ? true : false,
                    rows: rawProductSheet.rows.length - 2, //two rows for header
                    specimens: [],
                };
            } else
                return {
                    isValid: false,
                    rows: 0,
                    specimens: [],
                };
        });
    }
}
