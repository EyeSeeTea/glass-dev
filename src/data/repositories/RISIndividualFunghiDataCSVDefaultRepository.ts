import { Future, FutureData } from "../../domain/entities/Future";
import { RISIndividualFunghiData } from "../../domain/entities/data-entry/amr-individual-funghi-external/RISIndividualFunghiData";
import { RISIndividualFunghiDataRepository } from "../../domain/repositories/data-entry/RISIndividualFunghiDataRepository";

import { SpreadsheetXlsxDataSource } from "./SpreadsheetXlsxDefaultRepository";
import { doesColumnExist, getNumberValue, getTextValue } from "./utils/CSVUtils";

export class RISIndividualFunghiDataCSVDefaultRepository implements RISIndividualFunghiDataRepository {
    get(moduleName: string, file: File): FutureData<RISIndividualFunghiData[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR Individual & Funghi

            return (
                sheet?.rows.map(row => {
                    return {
                        COUNTRY: getTextValue(row, "COUNTRY"),
                        YEAR: getNumberValue(row, "YEAR"),
                        HCF_ID: getTextValue(row, "HCF_ID"),
                        HCF_TYPE: getTextValue(row, "HCF_TYPE"),
                        HOSPITALUNITTYPE: getTextValue(row, "HOSPITALUNITTYPE"),
                        PATIENT_ID: getTextValue(row, "PATIENT_ID"),
                        AGE: getTextValue(row, "AGE"),
                        GENDER: getTextValue(row, "GENDER"),
                        PATIENTTYPE: getTextValue(row, "PATIENTTYPE"),
                        DATEOFHOSPITALISATION_VISIT: getTextValue(row, "DATEOFHOSPITALISATION_VISIT"),
                        LABORATORYCODE: getNumberValue(row, "LABORATORYCODE"),
                        SAMPLE_DATE: getTextValue(row, "SAMPLE_DATE"),
                        ISOLATE_ID: getNumberValue(row, "ISOLATE_ID"),
                        SPECIMEN: getTextValue(row, "SPECIMEN"),
                        PATIENTCOUNTER: getNumberValue(row, "PATIENTCOUNTER"),
                        PATHOGEN: getTextValue(row, "PATHOGEN"),
                        ANTIBIOTIC: getTextValue(row, "ANTIBIOTIC"),
                        SIR: getTextValue(row, "SIR"),
                        REFERENCEGUIDELINESSIR: getTextValue(row, "REFERENCEGUIDELINESSIR"),
                        DISKLOAD: getTextValue(row, "DISKLOAD"),
                        RESULTETESTSIGN: getTextValue(row, "RESULTETESTSIGN"),
                        RESULTETESTVALUE: getNumberValue(row, "RESULTETESTVALUE"),
                        RESULTETESTSIR: getTextValue(row, "RESULTETESTSIR"),
                        RESULTZONESIGN: getTextValue(row, "RESULTZONESIGN"),
                        RESULTZONEVALUE: getNumberValue(row, "RESULTZONEVALUE"),
                        RESULTZONESIR: getTextValue(row, "RESULTZONESIR"),
                        RESULTMICSIGN: getTextValue(row, "RESULTMICSIGN"),
                        RESULTMICVALUE: getNumberValue(row, "RESULTMICVALUE"),
                        RESULTMICSIR: getTextValue(row, "RESULTMICSIR"),
                        ...(moduleName === "AMR - Individual" && {
                            ABCLASS: getTextValue(row, "ABCLASS"),
                        }),
                    };
                }) || []
            );
        });
    }

    validate(moduleName: string, file: File): FutureData<{ isValid: boolean; records: number; specimens: string[] }> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS

            const headerRow = sheet?.headers;

            if (headerRow) {
                const allRISIndividualFunghiColsPresent =
                    doesColumnExist(headerRow, "COUNTRY") &&
                    doesColumnExist(headerRow, "YEAR") &&
                    doesColumnExist(headerRow, "HCF_ID") &&
                    doesColumnExist(headerRow, "HOSPITALUNITTYPE") &&
                    doesColumnExist(headerRow, "PATIENT_ID") &&
                    doesColumnExist(headerRow, "AGE") &&
                    doesColumnExist(headerRow, "GENDER") &&
                    doesColumnExist(headerRow, "PATIENTTYPE") &&
                    doesColumnExist(headerRow, "DATEOFHOSPITALISATION_VISIT") &&
                    doesColumnExist(headerRow, "LABORATORYCODE") &&
                    doesColumnExist(headerRow, "SAMPLE_DATE") &&
                    doesColumnExist(headerRow, "ISOLATE_ID") &&
                    doesColumnExist(headerRow, "SPECIMEN") &&
                    doesColumnExist(headerRow, "PATIENTCOUNTER") &&
                    doesColumnExist(headerRow, "PATHOGEN") &&
                    doesColumnExist(headerRow, "ANTIBIOTIC") &&
                    doesColumnExist(headerRow, "SIR") &&
                    doesColumnExist(headerRow, "REFERENCEGUIDELINESSIR") &&
                    doesColumnExist(headerRow, "DISKLOAD") &&
                    moduleName === "AMR - Individual"
                        ? doesColumnExist(headerRow, "ABCLASS")
                        : !doesColumnExist(headerRow, "ABCLASS");

                const uniqSpecimens = _(sheet.rows)
                    .uniqBy("SPECIMEN")
                    .value()
                    .map(row => (row["SPECIMEN"] ? row["SPECIMEN"] : ""));

                return {
                    isValid: allRISIndividualFunghiColsPresent ? true : false,
                    records: sheet.rows.length,
                    specimens: uniqSpecimens,
                };
            } else
                return {
                    isValid: false,
                    records: 0,
                    specimens: [],
                };
        });
    }
}
