import Papa from "papaparse";
import { Future, FutureData } from "../../../domain/entities/Future";
import {
    CustomDataColumns,
    CustomDataElementNumber,
    CustomDataElementString,
} from "../../../domain/entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { SpreadsheetXlsxDataSource } from "../SpreadsheetXlsxDefaultRepository";
import { doesColumnExist, getNumberValue, getTextValue, isCsvFile } from "../utils/CSVUtils";
import { RISIndividualFungalDataRepository } from "../../../domain/repositories/data-entry/RISIndividualFungalDataRepository";

type RisIndivFungalFileValidationResult = {
    isValid: boolean;
    specimens: string[];
    rows: number;
    missingHeaders?: string[];
};
export class RISIndividualFungalDataCSVDefaultRepository implements RISIndividualFungalDataRepository {
    get(dataColumns: CustomDataColumns, file: File): FutureData<CustomDataColumns[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR Individual & Fungal

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

    validate(dataColumns: CustomDataColumns, file: File): FutureData<RisIndivFungalFileValidationResult> {
        if (isCsvFile(file)) {
            return this.validateCSVWithStreaming(dataColumns, file);
        } else {
            // TODO: evaluate removal. For now kept for backward compatibility
            return this.validateWithXLSX(dataColumns, file);
        }
    }

    private validateCSVWithStreaming(
        dataColumns: CustomDataColumns,
        file: File
    ): FutureData<RisIndivFungalFileValidationResult> {
        return Future.fromPromise(
            new Promise<RisIndivFungalFileValidationResult>((resolve, reject) => {
                const specimensSet = new Set<string>();
                let isFirstChunk = true;
                const result: RisIndivFungalFileValidationResult = {
                    isValid: false,
                    rows: 0,
                    specimens: [],
                };
                Papa.parse<Record<string, string>>(file, {
                    worker: true,
                    header: true,
                    skipEmptyLines: true,
                    chunk: (results, parser) => {
                        try {
                            if (isFirstChunk) {
                                const headers = results.meta.fields || [];
                                const missingHeaders = dataColumns
                                    .map(dc => dc.key)
                                    .filter(col => !doesColumnExist(headers, col));

                                isFirstChunk = false;

                                if (missingHeaders.length > 0) {
                                    result.missingHeaders = missingHeaders;
                                    parser.abort();
                                    return;
                                }
                            }

                            for (const row of results.data) {
                                result.rows++;
                                const specimenValue = row["SPECIMEN"];
                                if (specimenValue) {
                                    specimensSet.add(specimenValue);
                                }
                            }
                        } catch (error) {
                            reject(error);
                            parser.abort();
                        }
                    },
                    complete: parseResult => {
                        // TODO: check why after all chunks have been processed parseResult is undefined
                        const isValid = !parseResult || !parseResult.meta.aborted;
                        resolve({
                            ...result,
                            isValid: isValid,
                            specimens: Array.from(specimensSet),
                        });
                    },
                    error: error => {
                        reject(error);
                    },
                });
            })
        );
    }

    private validateWithXLSX(
        dataColumns: CustomDataColumns,
        file: File
    ): FutureData<RisIndivFungalFileValidationResult> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS

            const headerRow = sheet?.headers;

            if (headerRow) {
                const missingHeaders = dataColumns.map(dc => dc.key).filter(col => !doesColumnExist(headerRow, col));

                const uniqSpecimens = _(sheet.rows)
                    .uniqBy("SPECIMEN")
                    .value()
                    .map(row => (row["SPECIMEN"] ? row["SPECIMEN"] : ""));

                const isValid = missingHeaders.length === 0;
                return {
                    isValid: isValid,
                    rows: sheet.rows.length,
                    specimens: uniqSpecimens,
                    missingHeaders: isValid ? undefined : missingHeaders,
                };
            } else
                return {
                    isValid: false,
                    rows: 0,
                    specimens: [],
                };
        });
    }

    getFromBlob(dataColumns: CustomDataColumns, blob: Blob): FutureData<CustomDataColumns[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().readFromBlob(blob)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR Individual & Fungal

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
}
