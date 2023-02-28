import { Id } from "./Base";
import { UserGroup } from "./User";

interface ModuleUserGroups {
    readAccess: UserGroup[];
    captureAccess: UserGroup[];
}
export interface GlassModule {
    name: string;
    color: string;
    id: string;
    userGroups: ModuleUserGroups;
    questionnaires: QuestionnaireConfig[];
    countryInformationId?: Id;
}

interface QuestionnaireConfig {
    id: Id;
    mandatory?: boolean;
}
