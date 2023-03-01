export interface RISData {
    COUNTRY: string;
    YEAR: number;
    SPECIMEN: string;
    PATHOGEN: string;
    GENDER: string;
    ORIGIN: string;
    AGEGROUP: string;
    ANTIBIOTIC: string;
    RESISTANT: number;
    INTERMEDIATE: number;
    NONSUSCEPTIBLE: number;
    SUSCEPTIBLE: number;
    UNKNOWN_NO_AST: number;
    UNKNOWN_NO_BREAKPOINTS: number;
    BATCHID: string;
}

const mapDERISCodeTod2DE = {
    ANTIBIOTIC: "ANTIBIOTIC_DEA",
    PATHOGEN: "AMR_AMR_DEA_PATHOGEN",
    SPECIMEN: "AMR_AMR_DEA_SPECIMEN_TYPE_RIS",
};
