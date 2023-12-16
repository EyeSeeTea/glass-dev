import { Id } from "./Base";
import { QuestionnaireRule, QuestionnairesType } from "./Questionnaire";
import { UserGroup } from "./User";

interface ModuleUserGroups {
    readAccess: UserGroup[];
    captureAccess: UserGroup[];
    approveAccess: UserGroup[];
    confidentialAccess: UserGroup[];
}

type DataSubmissionPeriodTypes = "YEARLY" | "QUARTERLY";

export interface GlassModule {
    name: string;
    color: string;
    id: string;
    userGroups: ModuleUserGroups;
    questionnairesType?: QuestionnairesType;
    questionnaires: QuestionnaireConfig[];
    consistencyChecks?: {
        specimenPathogen: Record<string, string[]>;
        pathogenAntibiotic: Record<string, string[]>;
    };
    dashboards: {
        reportsMenu: string;
        validationReport: string;
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
}

interface QuestionnaireConfig {
    id: Id;
    mandatory?: boolean;
    rules?: QuestionnaireRule[];
}
