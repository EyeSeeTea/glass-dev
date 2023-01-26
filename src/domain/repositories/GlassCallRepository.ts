import { FutureData } from "../entities/Future";
import { GlassCall } from "../entities/GlassCallStatus";

export interface GlassCallRepository {
    getSpecificCall(module: string, orgUnit: string, period: number): FutureData<GlassCall[]>;
    getCallsByModuleAndOU(module: string, orgUnit: string): FutureData<GlassCall[]>;
}
