import { Row } from "../../../domain/repositories/SpreadsheetXlsxRepository";

export function getTextValue(row: Row<string>, column: string): string {
    return row[column] || "";
}

export function getNumberValue(row: Row<string>, column: string): number {
    return +(row[column] || 0);
}

export function getDateValue(row: Row<string>, column: string): Date {
    const value = row[column];
    let date = new Date();
    if (value !== undefined) {
        date = new Date(value);
    }
    return date;
}

export function doesColumnExist(row: Row<string>, column: string): boolean {
    return row[column] !== undefined;
}
