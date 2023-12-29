import { FutureData } from "../entities/Future";
import {
    ATCAlterationsData,
    ATCData,
    ConversionFactorData,
    DDDAlterationsData,
    DDDCombinationsData,
    DDDData,
    GlassATCHistory,
    GlassATCVersion,
} from "../entities/GlassATC";

export interface GlassATCRepository {
    getAtcHistory(): FutureData<Array<GlassATCHistory>>;
    getAtcVersion(
        atcVersionKey: string
    ): FutureData<
        Array<
            GlassATCVersion<
                DDDCombinationsData | ConversionFactorData | DDDData | ATCData | DDDAlterationsData | ATCAlterationsData
            >
        >
    >;
}
