import { D2Api } from "@eyeseetea/d2-api/2.34";
import { FutureData } from "../../../domain/entities/Future";
import { ProgramRulesMetadataRepository } from "../../../domain/repositories/program-rules/ProgramRulesMetadataRepository";
import { apiToFuture } from "../../../utils/futures";
import { Instance } from "../../entities/Instance";
import { getD2APiFromInstance } from "../../../utils/d2-api";
import { EGASPProgramMetadata, metadataQuery } from "../../../domain/entities/program-rules/EventEffectTypes";

export const EGASP_PROGRAM_ID = "SOjanrinfuG";

export class ProgramRulesMetadataDefaultRepository implements ProgramRulesMetadataRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    getMetadata(): FutureData<EGASPProgramMetadata> {
        return apiToFuture(
            this.api.metadata.get({
                ...metadataQuery,
                programs: { ...metadataQuery.programs, filter: { id: { eq: EGASP_PROGRAM_ID } } },
                programRules: {
                    ...metadataQuery.programRules,
                    filter: { "program.id": { eq: EGASP_PROGRAM_ID } },
                },
            })
        ).map(baseMetadata => {
            return { ...baseMetadata, dataElementsById: _.keyBy(baseMetadata.dataElements, de => de.id) };
        });
    }
}
