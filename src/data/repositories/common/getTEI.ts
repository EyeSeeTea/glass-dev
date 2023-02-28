import { FutureData } from "../../../domain/entities/Future";
import { D2Api } from "../../../types/d2-api";
import { apiToFuture } from "../../../utils/futures";
import { Event as ProgramEvent } from "@eyeseetea/d2-api/api/events";
import { ARMFocalPointProgram } from "../CountryInformationDefaultRepository";

const moduleAttribute = "Fh6atHPjdxC";

export function getTEI(api: D2Api, countryId: string, module: string): FutureData<D2TEI | undefined> {
    return apiToFuture(
        api.get<D2TEIsResponse>("/trackedEntityInstances", {
            program: ARMFocalPointProgram,
            ou: [countryId],
            fields: "*",
            totalPages: true,
            page: 1,
            pageSize: 1,
            filter: `${moduleAttribute}:eq:${module}`,
            order: "created:Desc",
        })
    ).map(response => response.trackedEntityInstances[0]);
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
