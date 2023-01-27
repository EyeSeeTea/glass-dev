import { FutureData } from "../entities/Future";
import { GlassDataSubmission } from "../entities/GlassDataSubmission";

export interface GlassDataSubmissionsRepository {
    getSpecificDataSubmission(module: string, orgUnit: string, period: number): FutureData<GlassDataSubmission[]>;
}
