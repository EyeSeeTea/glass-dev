import { FutureData } from "../../domain/entities/Future";
import { GlassCall } from "../../domain/entities/GlassCallStatus";
import { GlassCallRepository } from "../../domain/repositories/GlassCallRepository";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

export class GlassCallDefaultRepository implements GlassCallRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    getSpecificCall(module: string, orgUnit: string, period: number): FutureData<GlassCall[]> {
        return this.dataStoreClient.getObjectsFilteredByProps<GlassCall>(
            DataStoreKeys.DATA_SUBMISSIONS,
            new Map<keyof GlassCall, unknown>([
                ["module", module],
                ["orgUnit", orgUnit],
                ["period", period],
            ])
        );
    }
}
