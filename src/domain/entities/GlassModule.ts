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
    importCalculations: number;
};

export type PATHOGEN_ANTIBIOTIC_MAP = Record<string, string[]>;

export const MODULE_NAMES = {
    AMC: "AMC",
    AMR: "AMR",
    EGASP: "EGASP",
    AMR_INDIVIDUAL: "AMR - Individual",
    AMR_FUNGAL: "AMR - Fungal",
    EAR: "EAR",
} as const;

export type GlassModuleName = typeof MODULE_NAMES[keyof typeof MODULE_NAMES];

export function isGlassModuleName(value: unknown): value is GlassModuleName {
    return Object.values(MODULE_NAMES).includes(value as GlassModuleName);
}

export interface GlassModule {
    name: GlassModuleName;
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
    maxNumberOfRowsToSyncDeletion?: number;
    maxNumberOfRowsToSyncUploads?: number;
    asyncUploadChunkSizes?: {
        primaryUpload: number;
        secondaryUpload?: number;
    };
    asyncDeleteChunkSizes?: {
        primaryUpload: number;
        secondaryUpload?: number;
    };
}

export type LineListDetails = { id: Id; name?: string; programId: Id; programStageId?: Id };
interface QuestionnaireConfig {
    id: Id;
    mandatory?: boolean;
    rules?: QuestionnaireRule[];
}

export const DEFAULT_ASYNC_UPLOAD_DELETE_CHUNK_SIZE = 100;
