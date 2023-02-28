import { D2Api, MetadataPick } from "@eyeseetea/d2-api/2.34";
import { Event as ProgramEvent } from "@eyeseetea/d2-api/api/events";
import { CountryInformation } from "../../domain/entities/CountryInformation";
import { Future, FutureData } from "../../domain/entities/Future";
import { CountryInformationRepository } from "../../domain/repositories/CountryInformationRepository";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Instance } from "../entities/Instance";

const ARMFocalPointProgram = "oo0bqS0AqMI";
const moduleAttribute = "Fh6atHPjdxC";

export class CountryInformationDefaultRepository implements CountryInformationRepository {
    private api: D2Api;

    //TODO: @cache does not work with futures
    // I've created here an manual in memory cache to avoid many requests
    private inmemoryCache: Record<string, unknown> = {};

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    get(countryId: string, module: string): FutureData<CountryInformation> {
        let countryName = "";

        return this.getOrgUnits(countryId)
            .flatMap(orgUnits => {
                countryName = orgUnits.find(ou => ou.id === countryId)?.shortName || "";

                return Future.joinObj({
                    program: this.getProgram(),
                    tei: this.getTEI(countryId, module),
                    orgUnits: Future.success(orgUnits),
                });
            })
            .map(({ program, tei, orgUnits }) => {
                const country = orgUnits.find(ou => ou.id === countryId);
                const countryLevel = country?.level || 0;
                countryName = country?.shortName || "";
                const regionName =
                    orgUnits.find(ou => ou.id !== countryId && ou.level === countryLevel - 1)?.shortName || "";

                const enrollment = tei?.enrollments[0];
                const events = tei?.enrollments[0]?.events || [];
                const programstageDataElements = program?.programStages[0]?.programStageDataElements || [];

                return {
                    module,
                    WHORegion: regionName,
                    country: countryName,
                    year: new Date().getFullYear(),
                    nationalFocalPointId: enrollment?.enrollment,
                    enrolmentStatus: enrollment?.status || "",
                    enrolmentDate: enrollment?.enrollmentDate || "",
                    nationalFocalPoints:
                        events.map((event: ProgramEvent) => {
                            return {
                                id: event.event,
                                values: programstageDataElements.map(programStageDataElement => {
                                    const dataValue = event.dataValues.find(
                                        dv => dv.dataElement === programStageDataElement.dataElement.id
                                    );

                                    return {
                                        id: programStageDataElement.dataElement.id,
                                        name: programStageDataElement.dataElement.shortName,
                                        value: dataValue?.value || "",
                                    };
                                }),
                            };
                        }) || [],
                };
            })
            .mapError(error => {
                if (error.includes("Organisation unit is not part of the search scope")) {
                    return `Organisation unit is not part of the search scope: ${countryName}`;
                } else {
                    return error;
                }
            });
    }

    private getOrgUnits(countryId: string): FutureData<D2OrgUnit[]> {
        const cacheKey = `orgUnits-${countryId}`;

        return this.getFromCacheOrRemote(
            cacheKey,
            apiToFuture(
                this.api.get<D2OrgUnitsResponse>(`/organisationUnits/${countryId}`, {
                    fields: Object.keys(orgUnitFields).join(","),
                    includeAncestors: true,
                })
            ).map(response => response.organisationUnits)
        );
    }

    private getTEI(countryId: string, module: string): FutureData<D2TEI | undefined> {
        const cacheKey = `TEI-${countryId}-${module}`;

        return this.getFromCacheOrRemote(
            cacheKey,
            apiToFuture(
                this.api.get<D2TEIsResponse>("/trackedEntityInstances", {
                    program: ARMFocalPointProgram,
                    ou: [countryId],
                    fields: "*",
                    totalPages: true,
                    page: 1,
                    pageSize: 1,
                    filter: `${moduleAttribute}:eq:${module}`,
                    order: "created:Desc",
                })
            ).map(response => response.trackedEntityInstances[0])
        );
    }

    private getProgram(): FutureData<D2Program | undefined> {
        const cacheKey = `program`;

        return this.getFromCacheOrRemote(
            cacheKey,
            apiToFuture(
                this.api.models.programs.get({
                    fields: programFields,
                    includeAncestors: true,
                    filter: { id: { eq: ARMFocalPointProgram } },
                })
            ).map(response => response.objects[0])
        );
    }

    private getFromCacheOrRemote<T>(cacheKey: string, future: FutureData<T>): FutureData<T> {
        if (this.inmemoryCache[cacheKey]) {
            const orgUnits = this.inmemoryCache[cacheKey] as T;
            return Future.success(orgUnits);
        } else {
            return future.map(response => {
                this.inmemoryCache[cacheKey] = response;

                return response;
            });
        }
    }
}

export interface D2TEIsResponse {
    trackedEntityInstances: D2TEI[];
    pager: {
        pageSize: number;
        total: number;
        page: number;
    };
}

export interface D2TEI {
    trackedEntityInstance: string;
    enrollments: Enrollment[];
}

export interface Enrollment {
    enrollment: string;
    program: string;
    orgUnit: string;
    trackedEntityInstance: string;
    enrollmentDate: string;
    status: "ACTIVE" | "COMPLETED" | "CANCELED";
    events: ProgramEvent[];
}

const programFields = {
    id: true,
    programStages: {
        programStageDataElements: {
            id: true,
            sortOrder: true,
            dataElement: { id: true, shortName: true },
        },
    },
} as const;

type D2Program = MetadataPick<{
    programs: { fields: typeof programFields };
}>["programs"][number];

export interface D2OrgUnitsResponse {
    organisationUnits: D2OrgUnit[];
    pager: {
        pageSize: number;
        total: number;
        page: number;
    };
}

const orgUnitFields = {
    id: true,
    shortName: true,
    level: true,
} as const;

type D2OrgUnit = MetadataPick<{
    organisationUnits: { fields: typeof orgUnitFields };
}>["organisationUnits"][number];
