import { FutureData } from "../entities/Future";
import { NamedRef } from "../entities/Ref";
import { ModuleAccess, UserAccessInfo } from "../entities/User";

export interface InstanceRepository {
    getBaseUrl(): string;
    getCurrentUser(): FutureData<UserAccessInfo>;
    getInstanceVersion(): FutureData<string>;
    getCurrentUserModuleAccessData(userGroups: NamedRef[]): FutureData<ModuleAccess[]>;
}
