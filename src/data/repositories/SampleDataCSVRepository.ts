import { SampleData } from "../../domain/entities/data-entry/external/SampleData";
import { Future, FutureData } from "../../domain/entities/Future";
import { SampleDataRepository } from "../../domain/repositories/data-entry/SampleDataRepository";
import { SpreadsheetXlsxDataSource } from "../../domain/repositories/SpreadsheetXlsxRepository";
import { getNumberValue, getTextValue } from "./utils/CSVUtils";

export class SampleDataCSVRepository implements SampleDataRepository {
    get(file: File): FutureData<SampleData[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS

            return (
                sheet?.rows.map(row => {
                    return {
                        COUNTRY: getTextValue(row, "COUNTRY"),
                        YEAR: getNumberValue(row, "YEAR"),
                        SPECIMEN: getTextValue(row, "SPECIMEN"),
                        GENDER: getTextValue(row, "GENDER"),
                        ORIGIN: getTextValue(row, "ORIGIN"),
                        AGEGROUP: getTextValue(row, "AGEGROUP"),
                        NUMINFECTED: getNumberValue(row, "NUMINFECTED"),
                        NUMSAMPLEDPATIENTS: getNumberValue(row, "NUMSAMPLEDPATIENTS"),
                        BATCHID: getTextValue(row, "BATCHID"),
                    };
                }) || []
            );
        });
    }
}
