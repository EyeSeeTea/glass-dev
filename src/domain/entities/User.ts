import _ from "lodash";
import { FutureData } from "./Future";
import { NamedRef } from "./Ref";

export interface OrgUnitAccess {
    orgUnitId: string;
    orgUnitName: string;
    readAccess: boolean;
    captureAccess: boolean;
}

export interface UserGroup {
    id: string;
    name: string;
}
export interface ModuleAccess {
    moduleId: string;
    moduleName: string;
    readAccess: boolean;
    captureAccess: boolean;
    usergroups: UserGroup[];
}

export interface UserAccessInfo {
    id: string;
    name: string;
    username: string;
    userRoles: UserRole[];
    userGroups: NamedRef[];
    userOrgUnitsAccess: OrgUnitAccess[];
    userModulesAccess: FutureData<ModuleAccess[]>;
}

export interface UserRole extends NamedRef {
    authorities: string[];
}

export const isSuperAdmin = (user: UserAccessInfo): boolean => {
    return _.some(user.userRoles, ({ authorities }) => authorities.includes("ALL"));
};
