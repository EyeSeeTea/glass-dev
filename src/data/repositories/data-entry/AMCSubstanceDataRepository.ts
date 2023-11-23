import { Future, FutureData } from "../../../domain/entities/Future";
import { AMCDataRepository } from "../../../domain/repositories/data-entry/AMCDataRepository";
import { SpreadsheetXlsxDataSource } from "../SpreadsheetXlsxDefaultRepository";

export class AMCSubstanceDataRepository implements AMCDataRepository {
    validate(
        file: File,
        rawSubstanceDataColumns: string[]
    ): FutureData<{ isValid: boolean; rows: number; specimens: string[] }> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const rawSubstanceSheet = spreadsheet.sheets[0];
            const rawSubstanceHeaderRow = rawSubstanceSheet?.rows[1];

            if (rawSubstanceHeaderRow) {
                const sanitizedRawSubstanceHeaders = Object.values(rawSubstanceHeaderRow).map(header =>
                    header.replace(/[* \n\r]/g, "")
                );
                const allRawSubstanceCols = rawSubstanceDataColumns.map(col =>
                    sanitizedRawSubstanceHeaders.includes(col)
                );
                const allRawSubstanceColsPresent = _.every(allRawSubstanceCols, c => c === true);

                return {
                    isValid: allRawSubstanceColsPresent ? true : false,
                    rows: rawSubstanceSheet.rows.length - 2, //two rows for header
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
