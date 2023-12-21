import { Future, FutureData } from "../../../domain/entities/Future";
import {
    CustomDataColumns,
    CustomDataElementNumber,
    CustomDataElementString,
} from "../../../domain/entities/data-entry/amr-individual-funghi-external/RISIndividualFunghiData";
import { SpreadsheetXlsxDataSource } from "../SpreadsheetXlsxDefaultRepository";
import { doesColumnExist, getNumberValue, getTextValue } from "../utils/CSVUtils";
import { RISIndividualFunghiDataRepository } from "../../../domain/repositories/data-entry/RISIndividualFunghiDataRepository";

export class RISIndividualFunghiDataCSVDefaultRepository implements RISIndividualFunghiDataRepository {
    get(dataColumns: CustomDataColumns, file: File): FutureData<CustomDataColumns[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR Individual & Funghi

            const rows: CustomDataColumns[] =
                sheet?.rows.map(row => {
                    const data: CustomDataColumns = dataColumns.map(column => {
                        if (column.type === "string")
                            return {
                                key: column.key,
                                type: column.type,
                                value: getTextValue(row, column.key),
                            } as CustomDataElementString;
                        else
                            return {
                                key: column.key,
                                type: column.type,
                                value: getNumberValue(row, column.key),
                            } as CustomDataElementNumber;
                    });
                    return data;
                }) || [];
            return rows;
        });
    }

    validate(
        dataColumns: CustomDataColumns,
        file: File
    ): FutureData<{ isValid: boolean; specimens: string[]; rows: number }> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS

            const headerRow = sheet?.headers;

            if (headerRow) {
                const allRISIndividualFunghiColsPresent = dataColumns.every(col => doesColumnExist(headerRow, col.key));

                const uniqSpecimens = _(sheet.rows)
                    .uniqBy("SPECIMEN")
                    .value()
                    .map(row => (row["SPECIMEN"] ? row["SPECIMEN"] : ""));

                return {
                    isValid: allRISIndividualFunghiColsPresent ? true : false,
                    rows: sheet.rows.length,
                    specimens: uniqSpecimens,
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
