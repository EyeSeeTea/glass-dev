import { Future, FutureData } from "../../domain/entities/Future";
import {
    ATCAlterationsData,
    ATCData,
    ConversionFactorData,
    DDDAlterationsData,
    DDDCombinationsData,
    DDDData,
    GlassATCHistory,
    GlassATCVersion,
    validateAtcVersion,
} from "../../domain/entities/GlassATC";
import { GlassATCRepository } from "../../domain/repositories/GlassATCRepository";
import { cache } from "../../utils/cache";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";

export class GlassATCDefaultRepository implements GlassATCRepository {
    constructor(private dataStoreClient: DataStoreClient) {}

    @cache()
    getAtcHistory(): FutureData<Array<GlassATCHistory>> {
        return this.dataStoreClient.listCollection<GlassATCHistory>(DataStoreKeys.ATC_CLASSIFICATION);
    }

    @cache()
    getAtcVersion(
        atcVersionKey: string
    ): FutureData<
        Array<
            GlassATCVersion<
                DDDCombinationsData | ConversionFactorData | DDDData | ATCData | DDDAlterationsData | ATCAlterationsData
            >
        >
    > {
        if (validateAtcVersion(atcVersionKey)) {
            return this.dataStoreClient.listCollection<
                GlassATCVersion<
                    | DDDCombinationsData
                    | ConversionFactorData
                    | DDDData
                    | ATCData
                    | DDDAlterationsData
                    | ATCAlterationsData
                >
            >(atcVersionKey);
        }
        return Future.error("Upload does not exist");
    }
}
