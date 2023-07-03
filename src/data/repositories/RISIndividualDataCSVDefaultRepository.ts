import { Future, FutureData } from "../../domain/entities/Future";
import { RISIndividualData } from "../../domain/entities/data-entry/amr-i-external/RISIndividualData";

import { RISIndividualDataRepository } from "../../domain/repositories/data-entry/RISIndividualDataRepository";
import { SpreadsheetXlsxDataSource } from "./SpreadsheetXlsxDefaultRepository";
import { doesColumnExist, getNumberValue, getTextValue } from "./utils/CSVUtils";

export class RISIndividualDataCSVDefaultRepository implements RISIndividualDataRepository {
    get(file: File): FutureData<RISIndividualData[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR Individual

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
                    };
                }) || []
            );
        });
    }

    validate(file: File): FutureData<{ isValid: boolean; records: number; specimens: string[] }> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS
            const firstRow = sheet?.rows[0];

            if (firstRow) {
                const allRISIndividualColsPresent =
                    doesColumnExist(firstRow, "COUNTRY") &&
                    doesColumnExist(firstRow, "YEAR") &&
                    doesColumnExist(firstRow, "HCF_ID") &&
                    doesColumnExist(firstRow, "HOSPITALUNITTYPE") &&
                    doesColumnExist(firstRow, "PATIENT_ID") &&
                    doesColumnExist(firstRow, "AGE") &&
                    doesColumnExist(firstRow, "GENDER") &&
                    doesColumnExist(firstRow, "PATIENTTYPE") &&
                    doesColumnExist(firstRow, "DATEOFHOSPITALISATION_VISIT") &&
                    doesColumnExist(firstRow, "LABORATORYCODE") &&
                    doesColumnExist(firstRow, "SAMPLE_DATE") &&
                    doesColumnExist(firstRow, "ISOLATE_ID") &&
                    doesColumnExist(firstRow, "SPECIMEN") &&
                    doesColumnExist(firstRow, "PATIENTCOUNTER") &&
                    doesColumnExist(firstRow, "PATHOGEN") &&
                    doesColumnExist(firstRow, "ANTIBIOTIC") &&
                    doesColumnExist(firstRow, "SIR") &&
                    doesColumnExist(firstRow, "REFERENCEGUIDELINESSIR") &&
                    doesColumnExist(firstRow, "DISKLOAD");

                const uniqSpecimens = _(sheet.rows)
                    .uniqBy("SPECIMEN")
                    .value()
                    .map(row => (row["SPECIMEN"] ? row["SPECIMEN"] : ""));

                return {
                    isValid: allRISIndividualColsPresent ? true : false,
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
