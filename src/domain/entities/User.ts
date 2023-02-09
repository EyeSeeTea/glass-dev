import _ from "lodash";
import { NamedRef } from "./Ref";

export interface OrgUnitAccess {
    id: string;
    name: string;
    viewAccess: boolean;
    captureAccess: boolean;
}

export interface UserGroupAccess {
    id: string;
    name: string;
    moduleId: string;
    moduleName: string;
    viewAccess: boolean;
    captureAccess: boolean;
}

export interface UserAccessInfo {
    id: string;
    name: string;
    username: string;
    userRoles: UserRole[];
    userGroups: NamedRef[];
    userOrgUnitsAccess: OrgUnitAccess[];
    userModulesAccess: UserGroupAccess[];
}

export interface UserRole extends NamedRef {
    authorities: string[];
}

export const isSuperAdmin = (user: UserAccessInfo): boolean => {
    return _.some(user.userRoles, ({ authorities }) => authorities.includes("ALL"));
};
