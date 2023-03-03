import { Row } from "../../../domain/repositories/SpreadsheetXlsxRepository";

export function getTextValue(row: Row<string>, column: string): string {
    return row[column] || "";
}

export function getNumberValue(row: Row<string>, column: string): number {
    return +(row[column] || 0);
}
