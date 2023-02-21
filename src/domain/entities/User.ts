import _ from "lodash";
import { FutureData } from "./Future";
import { Id, NamedRef } from "./Ref";

export interface OrgUnitAccess {
    orgUnitId: Id;
    orgUnitName: string;
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
    userModulesAccess: FutureData<ModuleAccess[]>;
}

export interface UserRole extends NamedRef {
    authorities: string[];
}

export const isSuperAdmin = (user: UserAccessInfo): boolean => {
    return _.some(user.userRoles, ({ authorities }) => authorities.includes("ALL"));
};
