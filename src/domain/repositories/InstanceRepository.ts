import { FutureData } from "../entities/Future";
import { UserAccessInfo } from "../entities/User";

export interface InstanceRepository {
    getBaseUrl(): string;
    getCurrentUser(): FutureData<UserAccessInfo>;
    getInstanceVersion(): FutureData<string>;
}
