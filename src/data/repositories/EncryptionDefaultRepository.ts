import { D2Api } from "../../types/d2-api";
import { EncryptionRepository } from "../../domain/repositories/EncryptionRepository";
import { Future, FutureData } from "../../domain/entities/Future";
import { apiToFuture } from "../../utils/futures";
import { GLOBAL_ORG_UNIT } from "../../utils/logger";
import { EncryptionData } from "../../domain/entities/EncryptionData";

const AMR_GLASS_EGASP_PRE_ENCRYPTION_KEY_PROGRAM_ID = "Q80III6DvQ0";
const AMR_GLASS_EGASP_DET_SECERT_KEY = "xaeK6ke93aO";
const AMR_GLASS_EGASP_DET_SECERT_NONCE = "IaAtH8IRTqW";

export class EncryptionDefaultRepository implements EncryptionRepository {
    constructor(private api: D2Api) {}
    getEncryptionData(): FutureData<EncryptionData> {
        return apiToFuture(
            this.api.tracker.events.get({
                fields: { $all: true },
                orgUnit: GLOBAL_ORG_UNIT,
                skipPaging: true,
                program: AMR_GLASS_EGASP_PRE_ENCRYPTION_KEY_PROGRAM_ID,
            })
        ).flatMap(response => {
            if (response.instances.length > 1) return Future.error("More than one encryption data found");

            const instance = response.instances[0];
            if (!instance) return Future.error("No encryption data found");

            const nonce = instance.dataValues.find(dv => dv.dataElement === AMR_GLASS_EGASP_DET_SECERT_NONCE)?.value;
            const key = instance.dataValues.find(dv => dv.dataElement === AMR_GLASS_EGASP_DET_SECERT_KEY)?.value;

            if (!nonce || !key) return Future.error("No encryption data found");

            return Future.success({
                nonce: nonce,
                key: key,
            });
        });
    }
}
