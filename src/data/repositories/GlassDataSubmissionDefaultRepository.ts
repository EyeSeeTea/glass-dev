import { FutureData } from "../../domain/entities/Future";
import { GlassDataSubmission } from "../../domain/entities/GlassDataSubmission";
import { GlassDataSubmissionsRepository } from "../../domain/repositories/GlassDataSubmissionRepository";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

export class GlassDataSubmissionsDefaultRepository implements GlassDataSubmissionsRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    getSpecificDataSubmission(module: string, orgUnit: string, period: number): FutureData<GlassDataSubmission[]> {
        return this.dataStoreClient.getObjectsFilteredByProps<GlassDataSubmission>(
            DataStoreKeys.DATA_SUBMISSIONS,
            new Map<keyof GlassDataSubmission, unknown>([
                ["module", module],
                ["orgUnit", orgUnit],
                ["period", period],
            ])
        );
    }

    getDataSubmissionsByModuleAndOU(module: string, orgUnit: string): FutureData<GlassDataSubmission[]> {
        return this.dataStoreClient.getObjectsFilteredByProps<GlassDataSubmission>(
            DataStoreKeys.DATA_SUBMISSIONS,
            new Map<keyof GlassDataSubmission, unknown>([
                ["module", module],
                ["orgUnit", orgUnit],
            ])
        );
    }
}
