export type Async<Data> = Promise<Data>;
export interface SpreadsheetDataSource {
    read(inputFile: File): Async<Spreadsheet>;
    readFromArrayBuffer(arrayBuffer: ArrayBuffer, fileName?: string): Async<Spreadsheet>;
    encryptColumn(inputFile: File, rowCount: number): Async<File>;
}

export interface Spreadsheet {
    name: string;
    sheets: Sheet[];
}

export type Row<Header extends string> = Record<Header, string>;

export interface Sheet<Header extends string = string> {
    name: string;
    headers: string[];
    rows: Row<Header>[];
}
