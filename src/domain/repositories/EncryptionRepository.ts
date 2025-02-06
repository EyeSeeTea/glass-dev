import { FutureData } from "../entities/Future";

export type EncryptionData = {
    nonce: string;
    key: string;
};
export interface EncryptionRepository {
    getEncryptionData(): FutureData<EncryptionData>;
}
