import { FutureData } from "../../domain/entities/Future";
import { GlassSubmissions } from "../../domain/entities/GlassSubmissions";
import { GlassSubmissionsRepository } from "../../domain/repositories/GlassSubmissionsRepository";
import { cache } from "../../utils/cache";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

export class GlassSubmissionsDefaultRepository implements GlassSubmissionsRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    @cache()
    getAll(): FutureData<GlassSubmissions[]> {
        return this.dataStoreClient.listCollection<GlassSubmissions>(DataStoreKeys.SUBMISSIONS);
    }

    save(submission: GlassSubmissions): FutureData<void> {
        return this.dataStoreClient.listCollection(DataStoreKeys.SUBMISSIONS).flatMap(submissions => {
            const newSubmissions = [...submissions, submission];
            return this.dataStoreClient.saveObject(DataStoreKeys.SUBMISSIONS, newSubmissions);
        });
    }
}
