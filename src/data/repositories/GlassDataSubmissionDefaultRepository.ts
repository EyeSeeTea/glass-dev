import { Future, FutureData } from "../../domain/entities/Future";
import { DataSubmissionStatusTypes, GlassDataSubmission } from "../../domain/entities/GlassDataSubmission";
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

    getOpenDataSubmissionsByOU(orgUnit: string): FutureData<GlassDataSubmission[]> {
        return this.dataStoreClient.getObjectsFilteredByProps<GlassDataSubmission>(
            DataStoreKeys.DATA_SUBMISSIONS,
            new Map<keyof GlassDataSubmission, unknown>([
                ["period", new Date().getFullYear() - 1], //Open Data Submissions are for the previous year
                ["orgUnit", orgUnit],
            ])
        );
    }

    save(dataSubmission: GlassDataSubmission): FutureData<void> {
        return this.dataStoreClient.listCollection(DataStoreKeys.DATA_SUBMISSIONS).flatMap(dataSubmissions => {
            const newDataSubmissions = [...dataSubmissions, dataSubmission];
            return this.dataStoreClient.saveObject(DataStoreKeys.DATA_SUBMISSIONS, newDataSubmissions);
        });
    }

    saveMultiple(dataSubmissions: GlassDataSubmission[]): FutureData<void> {
        return this.dataStoreClient.listCollection(DataStoreKeys.DATA_SUBMISSIONS).flatMap(ds => {
            const newDataSubmissions = [...ds, ...dataSubmissions];
            return this.dataStoreClient.saveObject(DataStoreKeys.DATA_SUBMISSIONS, newDataSubmissions);
        });
    }

    setStatus(id: string, status: DataSubmissionStatusTypes): FutureData<void> {
        return this.dataStoreClient
            .listCollection<GlassDataSubmission>(DataStoreKeys.DATA_SUBMISSIONS)
            .flatMap(dataSubmissions => {
                const dataSubmission = dataSubmissions?.find(ds => ds.id === id);
                if (dataSubmission) {
                    dataSubmission.statusHistory.push({
                        from: dataSubmission.status,
                        to: status,
                        changedAt: new Date().toISOString(),
                    });
                    dataSubmission.status = status;
                    return this.dataStoreClient.saveObject(DataStoreKeys.DATA_SUBMISSIONS, dataSubmissions);
                } else {
                    return Future.error("Data Submission does not exist");
                }
            });
    }
}
