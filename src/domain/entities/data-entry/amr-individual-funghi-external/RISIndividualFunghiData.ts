// export interface RISIndividualFunghiData {
//     COUNTRY: string;
//     YEAR: number;
//     HEALTHCAREFACILITYTYPE: string;
//     HOSPITALUNITTYPE: string;
//     PATIENT_ID: string;
//     AGE: string;
//     GENDER: string;
//     PATIENTTYPE: string;
//     DATEOFADMISSION: string;
//     DATEUSEDFORSTATISTICS: string;
//     SPECIMEN: string;
//     PATIENTCOUNTER: number;
//     ANTIBIOTIC: string;
//     SIR: string;
//     REFERENCEGUIDELINESSIR: string;
//     DISKLOAD: string;
//     RESULTETESTSIGN: string;
//     RESULTETESTVALUE: number;
//     RESULTETESTSIR: string;
//     RESULTZONESIGN: string;
//     RESULTZONEVALUE: number;
//     RESULTZONESIR: string;
//     RESULTMICSIGN: string;
//     RESULTMICVALUE: number;
//     RESULTMICSIR: string;

//     //AMR - Individual
//     AB_CLASS: string;

//     //AMR - Funghi
//     ISOLATEID: string;
//     PATHOGEN_DET: string;
//     AST_HFC_ID: string;
//     AMR_LABORATORY_CODE: string;
//     AST_METHOD2: string;
//     IDENT_METHOD2: string;
//     PERFORMED_TEST2: string;
// }

export interface CustomDataElementString {
    key: string;
    type: "string";
    value?: string;
}
export interface CustomDataElementNumber {
    key: string;
    type: "number";
    value?: number;
}

export type CustomDataColumns = (CustomDataElementString | CustomDataElementNumber)[];
export const amrIDataColumns: CustomDataColumns = [
    { key: "COUNTRY", type: "string" },
    { key: "YEAR", type: "number" },
    { key: "HEALTHCAREFACILITYTYPE", type: "string" },
    { key: "HOSPITALUNITTYPE", type: "string" },
    { key: "PATIENT_ID", type: "string" },
    { key: "AGE", type: "string" },
    { key: "GENDER", type: "string" },
    { key: "PATIENTTYPE", type: "string" },
    { key: "DATEOFADMISSION", type: "string" },
    { key: "DATEUSEDFORSTATISTICS", type: "string" },
    { key: "SPECIMEN", type: "string" },
    { key: "PATIENTCOUNTER", type: "number" },
    { key: "ANTIBIOTIC", type: "string" },
    { key: "SIR", type: "string" },
    { key: "REFERENCEGUIDELINESSIR", type: "string" },
    { key: "DISKLOAD", type: "string" },
    { key: "RESULTETESTSIGN", type: "string" },
    { key: "RESULTETESTVALUE", type: "number" },
    { key: "RESULTETESTSIR", type: "string" },
    { key: "RESULTZONESIGN", type: "string" },
    { key: "RESULTZONEVALUE", type: "number" },
    { key: "RESULTZONESIR", type: "string" },
    { key: "RESULTMICSIGN", type: "string" },
    { key: "RESULTMICVALUE", type: "number" },
    { key: "RESULTMICSIR", type: "string" },

    { key: "AB_CLASS", type: "string" },
];

export const amrFDataColumns: CustomDataColumns = [
    { key: "COUNTRY", type: "string" },
    { key: "YEAR", type: "number" },
    { key: "HEALTHCAREFACILITYTYPE", type: "string" },
    { key: "HOSPITALUNITTYPE", type: "string" },
    { key: "PATIENT_ID", type: "string" },
    { key: "AGE", type: "string" },
    { key: "GENDER", type: "string" },
    { key: "PATIENTTYPE", type: "string" },
    { key: "DATEOFADMISSION", type: "string" },
    { key: "DATEUSEDFORSTATISTICS", type: "string" },
    { key: "SPECIMEN", type: "string" },
    { key: "PATIENTCOUNTER", type: "number" },
    { key: "ANTIBIOTIC", type: "string" },
    { key: "SIR", type: "string" },
    { key: "REFERENCEGUIDELINESSIR", type: "string" },
    { key: "DISKLOAD", type: "string" },
    { key: "RESULTETESTSIGN", type: "string" },
    { key: "RESULTETESTVALUE", type: "number" },
    { key: "RESULTETESTSIR", type: "string" },
    { key: "RESULTZONESIGN", type: "string" },
    { key: "RESULTZONEVALUE", type: "number" },
    { key: "RESULTZONESIR", type: "string" },
    { key: "RESULTMICSIGN", type: "string" },
    { key: "RESULTMICVALUE", type: "number" },
    { key: "RESULTMICSIR", type: "string" },

    { key: "ISOLATEID", type: "string" },
    { key: "PATHOGEN_DET", type: "string" },
    { key: "AST_HFC_ID", type: "string" },
    { key: "AMR_LABORATORY_CODE", type: "string" },
    { key: "AST_METHOD2", type: "string" },
    { key: "IDENT_METHOD2", type: "string" },
    { key: "PERFORMED_TEST2", type: "string" },
];
