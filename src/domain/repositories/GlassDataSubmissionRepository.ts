import { FutureData } from "../entities/Future";
import { DataSubmissionStatusTypes, GlassDataSubmission } from "../entities/GlassDataSubmission";

export interface GlassDataSubmissionsRepository {
    getSpecificDataSubmission(module: string, orgUnit: string, period: string): FutureData<GlassDataSubmission[]>;
    getDataSubmissionsByModuleAndOU(module: string, orgUnit: string): FutureData<GlassDataSubmission[]>;
    getOpenDataSubmissionsByOU(orgUnit: string): FutureData<GlassDataSubmission[]>;
    save(dataSubmission: GlassDataSubmission): FutureData<void>;
    saveMultiple(dataSubmission: GlassDataSubmission[]): FutureData<void>;
    setStatus(id: string, status: DataSubmissionStatusTypes): FutureData<void>;
}
