import { DataForm } from "../entities/DataForm";
import { FutureData } from "../entities/Future";
import { Id } from "../entities/Ref";
import { UserAccessInfo } from "../entities/User";

export interface InstanceRepository {
    getBaseUrl(): string;
    getCurrentUser(): FutureData<UserAccessInfo>;
    getInstanceVersion(): FutureData<string>;
    getProgram(programId: Id): FutureData<any>;
    getProgramAsync(id: Id): Promise<DataForm[]>;
}
