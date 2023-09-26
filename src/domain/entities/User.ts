import _ from "lodash";
import { Id, NamedRef } from "./Ref";

export interface OrgUnitAccess {
    orgUnitId: Id;
    orgUnitName: string;
    orgUnitShortName: string;
    orgUnitCode: string;
    orgUnitPath: string;
    readAccess: boolean;
    captureAccess: boolean;
}

export interface UserGroup {
    id: Id;
    name: string;
}
export interface ModuleAccess {
    moduleId: Id;
    moduleName: string;
    readAccess: boolean;
    captureAccess: boolean;
    usergroups: UserGroup[];
}

export interface UserAccessInfo {
    id: Id;
    name: string;
    username: string;
    userRoles: UserRole[];
    userGroups: NamedRef[];
    userOrgUnitsAccess: OrgUnitAccess[];
    userModulesAccess: ModuleAccess[];
    quarterlyPeriodModules: { id: string; name: string }[];
    gender: string;
    email: string;
    phoneNumber: string;
    introduction: string;
    birthday: string;
    nationality: string;
    employer: string;
    jobTitle: string;
    education: string;
    interests: string;
    languages: string;
    settings: {
        keyUiLocale: string;
        keyDbLocale: string;
        keyMessageEmailNotification: boolean;
        keyMessageSmsNotification: boolean;
    };
}

export interface UserRole extends NamedRef {
    authorities: string[];
}

export const isSuperAdmin = (user: UserAccessInfo): boolean => {
    return _.some(user.userRoles, ({ authorities }) => authorities.includes("ALL"));
};
