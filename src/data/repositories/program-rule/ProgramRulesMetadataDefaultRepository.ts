import { D2Api } from "@eyeseetea/d2-api/2.34";
import { Future, FutureData } from "../../../domain/entities/Future";
import { ProgramRulesMetadataRepository } from "../../../domain/repositories/program-rules/ProgramRulesMetadataRepository";
import { apiToFuture } from "../../../utils/futures";
import { Instance } from "../../entities/Instance";
import { getD2APiFromInstance } from "../../../utils/d2-api";
import { BulkLoadMetadata, metadataQuery } from "../../../domain/entities/program-rules/EventEffectTypes";
import { Maybe } from "../../../types/utils";
import { D2TrackerTrackedEntity } from "@eyeseetea/d2-api/api/trackerTrackedEntities";

export const EGASP_PROGRAM_ID = "SOjanrinfuG";

export class ProgramRulesMetadataDefaultRepository implements ProgramRulesMetadataRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    getMetadata(programId: string): FutureData<BulkLoadMetadata> {
        return apiToFuture(
            this.api.metadata.get({
                ...metadataQuery,
                programs: { ...metadataQuery.programs, filter: { id: { eq: programId } } },
                programRules: {
                    ...metadataQuery.programRules,
                    filter: { "program.id": { eq: programId } },
                },
            })
        ).map(baseMetadata => {
            return { ...baseMetadata, dataElementsById: _.keyBy(baseMetadata.dataElements, de => de.id) };
        });
    }

    async getTrackedEntityInstances(programId: string, orgUnitId: string): Promise<D2TrackerTrackedEntity[]> {
        let page = 1;
        const pageSize = 1000;
        let total: Maybe<{ pages: number }>;
        const allTeis: D2TrackerTrackedEntity[] = [];

        do {
            const res = await this.api.tracker.trackedEntities
                .get({
                    program: programId,

                    fields: { enrollments: { events: true } },
                    orgUnit: orgUnitId,
                    ouMode: "SELECTED",
                    enrollmentEnrolledBefore: new Date().toISOString(),
                    totalPages: true,
                    page: page,
                    pageSize: pageSize,
                })
                .getData();

            const teis = res.instances;
            total = { pages: res.total ?? 0 };

            allTeis.push(...teis);
            page++;
        } while (page <= total?.pages);

        return allTeis;
    }

    getTEIs(programId: string, orgUnitId: string): FutureData<D2TrackerTrackedEntity[]> {
        return Future.fromPromise(this.getTrackedEntityInstances(programId, orgUnitId));
    }
}
