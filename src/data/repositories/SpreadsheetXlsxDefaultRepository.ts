import _ from "lodash";
import * as XLSX from "xlsx";
import {
    Async,
    Row,
    Sheet,
    Spreadsheet,
    SpreadsheetDataSource,
} from "../../domain/repositories/SpreadsheetXlsxRepository";

export class SpreadsheetXlsxDataSource implements SpreadsheetDataSource {
    async read(inputFile: File): Async<Spreadsheet> {
        try {
            const workbook = XLSX.read(await inputFile?.arrayBuffer(), { cellDates: true });

            const sheets = _(workbook.Sheets)
                .toPairs()
                .map(([sheetName, worksheet]): Sheet => {
                    const headers = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: "" })[0] || [];
                    const rows = XLSX.utils.sheet_to_json<Row<string>>(worksheet, { raw: true, skipHidden: false });

                    return {
                        name: sheetName,
                        headers,
                        rows,
                    };
                })
                .value();

            const spreadsheet: Spreadsheet = {
                name: inputFile.name,
                sheets,
            };

            return spreadsheet;
        } catch (e) {
            return { name: "", sheets: [] };
        }
    }
}
