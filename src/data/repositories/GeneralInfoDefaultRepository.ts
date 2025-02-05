import { D2Api } from "@eyeseetea/d2-api/2.34";
import { Future, FutureData } from "../../domain/entities/Future";
import { cache } from "../../utils/cache";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { DataStoreClient } from "../data-store/DataStoreClient";
import { DataStoreKeys } from "../data-store/DataStoreKeys";
import { Instance } from "../entities/Instance";
import { GlassGeneralInfo } from "../../domain/entities/GlassGeneralInfo";
import { GeneralInfoRepository } from "../../domain/repositories/GeneralInfoRepository";

export class GeneralInfoDefaultRepository implements GeneralInfoRepository {
    private api: D2Api;

    constructor(private dataStoreClient: DataStoreClient, instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    @cache()
    get(): FutureData<GlassGeneralInfo> {
        return this.dataStoreClient.getObject<GlassGeneralInfo>(DataStoreKeys.GENERAL).flatMap(generalInfo => {
            if (generalInfo) {
                return Future.success(generalInfo);
            } else {
                return Future.error(`General key not found in datastore`);
            }
        });
    }
}
