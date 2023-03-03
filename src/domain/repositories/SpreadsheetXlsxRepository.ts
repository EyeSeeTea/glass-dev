import _ from "lodash";
import * as XLSX from "xlsx";

export type Async<Data> = Promise<Data>;
export interface SpreadsheetDataSource {
    read(inputFile: File): Async<Spreadsheet>;
}

export interface ReadOptions {
    inputFile: File;
    skipHidden: boolean;
}

export interface Spreadsheet {
    name: string;
    sheets: Sheet[];
}

export type Row<Header extends string> = Record<Header, string>;

export interface Sheet<Header extends string = string> {
    name: string;
    rows: Row<Header>[];
}
export class SpreadsheetXlsxDataSource implements SpreadsheetDataSource {
    async read(inputFile: File): Async<Spreadsheet> {
        try {
            const workbook = XLSX.read(await inputFile?.arrayBuffer());

            const sheets = _(workbook.Sheets)
                .toPairs()
                .map(([sheetName, worksheet]): Sheet => {
                    const rows = XLSX.utils.sheet_to_json<Row<string>>(worksheet, { raw: true, skipHidden: false });

                    return {
                        name: sheetName,
                        rows: rows.map(row => _.mapValues(row, cellValue => cellValue)),
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
