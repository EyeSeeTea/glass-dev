import { Future, FutureData } from "../../../domain/entities/Future";
import { RISIndividualFunghiData } from "../../../domain/entities/data-entry/amr-individual-funghi-external/RISIndividualFunghiData";
import { SpreadsheetXlsxDataSource } from "../SpreadsheetXlsxDefaultRepository";
import { doesColumnExist, getNumberValue, getTextValue } from "../utils/CSVUtils";
import { RISIndividualFunghiDataRepository } from "../../../domain/repositories/data-entry/RISIndividualFunghiDataRepository";

export class RISIndividualFunghiDataCSVDefaultRepository implements RISIndividualFunghiDataRepository {
    get(moduleName: string, file: File): FutureData<RISIndividualFunghiData[]> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR Individual & Funghi

            return (
                sheet?.rows.map(row => {
                    return {
                        COUNTRY: getTextValue(row, "COUNTRY"),
                        YEAR: getNumberValue(row, "YEAR"),
                        HEALTHCAREFACILITYTYPE: getTextValue(row, "HEALTHCAREFACILITYTYPE"),
                        HOSPITALUNITTYPE: getTextValue(row, "HOSPITALUNITTYPE"),
                        PATIENT_ID: getTextValue(row, "PATIENT_ID"),
                        AGE: getTextValue(row, "AGE"),
                        GENDER: getTextValue(row, "GENDER"),
                        PATIENTTYPE: getTextValue(row, "PATIENTTYPE"),
                        DATEOFADMISSION: getTextValue(row, "DATEOFADMISSION"),
                        DATEUSEDFORSTATISTICS: getTextValue(row, "DATEUSEDFORSTATISTICS"),
                        SPECIMEN: getTextValue(row, "SPECIMEN"),
                        PATIENTCOUNTER: getNumberValue(row, "PATIENTCOUNTER"),
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
                        AB_CLASS: moduleName === "AMR - Individual" ? getTextValue(row, "AB_CLASS") : "",
                        ISOLATEID: moduleName === "AMR - Funghi" ? getTextValue(row, "ISOLATEID") : "",
                        PATHOGEN_DET: moduleName === "AMR - Funghi" ? getTextValue(row, "PATHOGEN_DET") : "",
                        AST_HFC_ID: moduleName === "AMR - Funghi" ? getTextValue(row, "AST_HFC_ID") : "",
                        AMR_LABORATORY_CODE:
                            moduleName === "AMR - Funghi" ? getTextValue(row, "AMR_LABORATORY_CODE") : "",
                        AST_METHOD2: moduleName === "AMR - Funghi" ? getTextValue(row, "AST_METHOD2") : "",
                        IDENT_METHOD2: moduleName === "AMR - Funghi" ? getTextValue(row, "IDENT_METHOD2") : "",
                        PERFORMED_TEST2: moduleName === "AMR - Funghi" ? getTextValue(row, "PERFORMED_TEST2") : "",
                    };
                }) || []
            );
        });
    }

    validate(moduleName: string, file: File): FutureData<{ isValid: boolean; specimens: string[]; rows: number }> {
        return Future.fromPromise(new SpreadsheetXlsxDataSource().read(file)).map(spreadsheet => {
            const sheet = spreadsheet.sheets[0]; //Only one sheet for AMR RIS

            const headerRow = sheet?.headers;

            if (headerRow) {
                const allRISIndividualFunghiColsPresent =
                    doesColumnExist(headerRow, "COUNTRY") &&
                    doesColumnExist(headerRow, "YEAR") &&
                    doesColumnExist(headerRow, "HEALTHCAREFACILITYTYPE") &&
                    doesColumnExist(headerRow, "HOSPITALUNITTYPE") &&
                    doesColumnExist(headerRow, "PATIENT_ID") &&
                    doesColumnExist(headerRow, "AGE") &&
                    doesColumnExist(headerRow, "GENDER") &&
                    doesColumnExist(headerRow, "PATIENTTYPE") &&
                    doesColumnExist(headerRow, "DATEOFADMISSION") &&
                    doesColumnExist(headerRow, "DATEUSEDFORSTATISTICS") &&
                    doesColumnExist(headerRow, "SPECIMEN") &&
                    doesColumnExist(headerRow, "PATIENTCOUNTER") &&
                    doesColumnExist(headerRow, "ANTIBIOTIC") &&
                    doesColumnExist(headerRow, "SIR") &&
                    doesColumnExist(headerRow, "REFERENCEGUIDELINESSIR") &&
                    doesColumnExist(headerRow, "DISKLOAD") &&
                    doesColumnExist(headerRow, "RESULTETESTSIGN") &&
                    doesColumnExist(headerRow, "RESULTETESTVALUE") &&
                    doesColumnExist(headerRow, "RESULTETESTSIR") &&
                    doesColumnExist(headerRow, "RESULTZONESIGN") &&
                    doesColumnExist(headerRow, "RESULTZONEVALUE") &&
                    doesColumnExist(headerRow, "RESULTZONESIR") &&
                    doesColumnExist(headerRow, "RESULTMICSIGN") &&
                    doesColumnExist(headerRow, "RESULTMICVALUE") &&
                    doesColumnExist(headerRow, "RESULTMICSIR") &&
                    (moduleName === "AMR - Individual"
                        ? doesColumnExist(headerRow, "AB_CLASS")
                        : !doesColumnExist(headerRow, "AB_CLASS")) &&
                    (moduleName === "AMR - Funghi"
                        ? doesColumnExist(headerRow, "ISOLATEID")
                        : !doesColumnExist(headerRow, "ISOLATEID")) &&
                    (moduleName === "AMR - Funghi"
                        ? doesColumnExist(headerRow, "PATHOGEN_DET")
                        : !doesColumnExist(headerRow, "PATHOGEN_DET")) &&
                    (moduleName === "AMR - Funghi"
                        ? doesColumnExist(headerRow, "AST_HFC_ID")
                        : !doesColumnExist(headerRow, "AST_HFC_ID")) &&
                    (moduleName === "AMR - Funghi"
                        ? doesColumnExist(headerRow, "AMR_LABORATORY_CODE")
                        : !doesColumnExist(headerRow, "AMR_LABORATORY_CODE")) &&
                    (moduleName === "AMR - Funghi"
                        ? doesColumnExist(headerRow, "AST_METHOD2")
                        : !doesColumnExist(headerRow, "AST_METHOD2")) &&
                    (moduleName === "AMR - Funghi"
                        ? doesColumnExist(headerRow, "IDENT_METHOD2")
                        : !doesColumnExist(headerRow, "IDENT_METHOD2")) &&
                    (moduleName === "AMR - Funghi"
                        ? doesColumnExist(headerRow, "PERFORMED_TEST2")
                        : !doesColumnExist(headerRow, "PERFORMED_TEST2"));

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
