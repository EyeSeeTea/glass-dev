import { Id } from "./Base";
import { CustomDataColumns } from "./data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { QuestionnaireRule, QuestionnairesType } from "./Questionnaire";
import { NamedRef } from "./Ref";
import { UserGroup } from "./User";

interface ModuleUserGroups {
    readAccess: UserGroup[];
    captureAccess: UserGroup[];
    approveAccess: UserGroup[];
    confidentialAccess: UserGroup[];
}

type DataSubmissionPeriodTypes = "YEARLY" | "QUARTERLY";
export type ChunkSizes = {
    productIds: number;
    substanceIds: number;
};

export type PATHOGEN_ANTIBIOTIC_MAP = Record<string, string[]>;
export interface GlassModule {
    name: string;
    color: string;
    id: string;
    userGroups: ModuleUserGroups;
    questionnairesType?: QuestionnairesType;
    questionnaires: QuestionnaireConfig[];
    consistencyChecks?: {
        specimenPathogen: Record<string, PATHOGEN_ANTIBIOTIC_MAP[]>;
    };
    dashboards: {
        reportsMenu: string;
        validationReport: string;
        multiReportsMenu?: NamedRef[];
        multiValidationReports?: NamedRef[];
    };
    dataSubmissionPeriod: DataSubmissionPeriodTypes;
    dataColumns: string[];
    teiColumns?: string[];
    rawSubstanceDataColumns?: string[];
    programs?: {
        id: string;
        programStageId: string;
    }[];
    populateCurrentYearInHistory?: boolean;
    startPeriod?: number;
    customDataColumns?: CustomDataColumns;
    lineLists?: LineListDetails[];
    chunkSizes?: ChunkSizes;
}

export type LineListDetails = { id: Id; name?: string; programId: Id; programStageId?: Id };
interface QuestionnaireConfig {
    id: Id;
    mandatory?: boolean;
    rules?: QuestionnaireRule[];
}
