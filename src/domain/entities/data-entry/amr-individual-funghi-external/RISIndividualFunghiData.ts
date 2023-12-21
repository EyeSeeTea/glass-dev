export interface RISIndividualFunghiData {
    COUNTRY: string;
    YEAR: number;
    HEALTHCAREFACILITYTYPE: string;
    HOSPITALUNITTYPE: string;
    PATIENT_ID: string;
    AGE: string;
    GENDER: string;
    PATIENTTYPE: string;
    DATEOFADMISSION: string;
    DATEUSEDFORSTATISTICS: string;
    SPECIMEN: string;
    PATIENTCOUNTER: number;
    ANTIBIOTIC: string;
    SIR: string;
    REFERENCEGUIDELINESSIR: string;
    DISKLOAD: string;
    RESULTETESTSIGN: string;
    RESULTETESTVALUE: number;
    RESULTETESTSIR: string;
    RESULTZONESIGN: string;
    RESULTZONEVALUE: number;
    RESULTZONESIR: string;
    RESULTMICSIGN: string;
    RESULTMICVALUE: number;
    RESULTMICSIR: string;

    //AMR - Individual
    AB_CLASS: string;

    //AMR - Funghi
    ISOLATEID: string;
    PATHOGEN_DET: string;
    AST_HFC_ID: string;
    AMR_LABORATORY_CODE: string;
    AST_METHOD2: string;
    IDENT_METHOD2: string;
    PERFORMED_TEST2: string;
}
