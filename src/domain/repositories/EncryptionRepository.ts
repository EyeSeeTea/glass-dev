import { EncryptionData } from "../entities/EncryptionData";
import { FutureData } from "../entities/Future";

export interface EncryptionRepository {
    getEncryptionData(): FutureData<EncryptionData>;
}
