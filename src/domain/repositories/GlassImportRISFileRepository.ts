import { DataValueSetsPostParams, DataValueSetsPostRequest, DataValueSetsPostResponse } from "@eyeseetea/d2-api/api";
import { FutureData } from "../entities/Future";

export interface GlassImportRISFileRepository {
    importRISFile(
        params: DataValueSetsPostParams,
        request: DataValueSetsPostRequest
    ): FutureData<DataValueSetsPostResponse>;
}
