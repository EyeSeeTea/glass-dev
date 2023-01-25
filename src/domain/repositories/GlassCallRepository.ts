import { FutureData } from "../entities/Future";
import { GlassCall } from "../entities/GlassCallStatus";

export interface GlassCallRepository {
    getSpecificCall(module: string, orgUnit: string, period: number): FutureData<GlassCall[]>;
    getCallsByModule(module: string): FutureData<GlassCall[]>;
}
