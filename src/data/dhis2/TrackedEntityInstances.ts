import { Ref } from "../../domain/entities/Ref";
import { D2Api, Id } from "../../types/d2-api";
import { Moment } from "moment";
import {
    RelationshipMetadata,
    RelationshipOrgUnitFilter,
    fromApiRelationships,
    getRelationshipMetadata,
} from "../repositories/download-template/Dhis2RelationshipTypes";
import {
    AttributeValue,
    Enrollment,
    Program,
    TrackedEntityInstance,
} from "../../domain/entities/TrackedEntityInstance";
import {
    PaginatedTeiGetResponse,
    TrackedEntityInstance as TrackedEntityInstanceApi,
} from "@eyeseetea/d2-api/api/trackedEntityInstances";
import { KeysOfUnion } from "../../types/utils";
import { DataElementType } from "../../domain/entities/DataForm";
import { Geometry } from "../../domain/entities/Geometry";

export interface GetOptions {
    api: D2Api;
    program: Ref;
    orgUnits: Ref[];
    pageSize?: number;
    enrollmentStartDate?: Moment;
    enrollmentEndDate?: Moment;
    relationshipsOuFilter?: RelationshipOrgUnitFilter;
}

export async function getTrackedEntityInstances(options: GetOptions): Promise<TrackedEntityInstance[]> {
    const {
        api,
        orgUnits,
        pageSize = 500,
        enrollmentStartDate,
        enrollmentEndDate,
        relationshipsOuFilter = "CAPTURE",
    } = options;
    if (_.isEmpty(orgUnits)) return [];

    const program = await getProgram(api, options.program.id);
    if (!program) return [];

    const metadata = await getRelationshipMetadata(program, api, {
        organisationUnits: orgUnits,
        ouMode: relationshipsOuFilter,
    });

    // Avoid 414-uri-too-large by spliting orgUnit in chunks
    const orgUnitsList = _.chunk(orgUnits, 250);

    // Get TEIs for the first page:
    const apiTeis: TrackedEntityInstanceApi[] = [];

    for (const orgUnits of orgUnitsList) {
        // Limit response size by requesting paginated TEIs
        for (let page = 1; ; page++) {
            const { pager, trackedEntityInstances } = await getTeisFromApi({
                api,
                program,
                orgUnits,
                page,
                pageSize,
                enrollmentStartDate,
                enrollmentEndDate,
                ouMode: relationshipsOuFilter,
            });
            apiTeis.push(...trackedEntityInstances);
            if (pager.pageCount <= page) break;
        }
    }

    return apiTeis.map(tei => buildTei(metadata, program, tei));
}

export async function getProgram(api: D2Api, id: Id): Promise<Program | undefined> {
    const {
        objects: [apiProgram],
    } = await api.models.programs
        .get({
            fields: {
                id: true,
                trackedEntityType: { id: true },
                programTrackedEntityAttributes: {
                    trackedEntityAttribute: {
                        id: true,
                        name: true,
                        valueType: true,
                        optionSet: { id: true, options: { id: true, code: true } },
                    },
                },
            },
            filter: { id: { eq: id } },
        })
        .getData();

    if (!apiProgram) return;

    const program: Program = {
        id: apiProgram.id,
        trackedEntityType: { id: apiProgram.trackedEntityType.id },
        attributes: apiProgram.programTrackedEntityAttributes.map(
            ({ trackedEntityAttribute }) => trackedEntityAttribute
        ),
    };

    return program;
}

type TeiKey = KeysOfUnion<TrackedEntityInstanceApi>;

async function getTeisFromApi(options: {
    api: D2Api;
    program: Program;
    orgUnits: Ref[];
    page: number;
    pageSize: number;
    enrollmentStartDate?: Moment;
    enrollmentEndDate?: Moment;
    ouMode: RelationshipOrgUnitFilter;
}): Promise<PaginatedTeiGetResponse> {
    const { api, program, orgUnits, page, pageSize, enrollmentStartDate, enrollmentEndDate, ouMode } = options;

    const fields: TeiKey[] = [
        "trackedEntityInstance",
        "inactive",
        "orgUnit",
        "attributes",
        "enrollments",
        "relationships",
        "featureType",
        "geometry",
    ];

    const ouModeQuery =
        ouMode === "SELECTED" || ouMode === "CHILDREN" || ouMode === "DESCENDANTS"
            ? { ouMode, ou: orgUnits?.map(({ id }) => id) }
            : { ouMode };

    return api.trackedEntityInstances
        .get({
            ...ouModeQuery,
            order: "created:asc",
            program: program.id,
            pageSize,
            page,
            totalPages: true,
            fields: fields.join(","),
            programStartDate: enrollmentStartDate?.format("YYYY-MM-DD[T]HH:mm"),
            programEndDate: enrollmentEndDate?.format("YYYY-MM-DD[T]HH:mm"),
        })
        .getData();
}

function buildTei(
    metadata: RelationshipMetadata,
    program: Program,
    teiApi: TrackedEntityInstanceApi
): TrackedEntityInstance {
    const orgUnit = { id: teiApi.orgUnit };
    const attributesById = _.keyBy(program.attributes, attribute => attribute.id);

    const enrollment: Enrollment | undefined = _(teiApi.enrollments)
        .filter(e => e.program === program.id && orgUnit.id === e.orgUnit)
        .map(enrollmentApi => ({
            id: enrollmentApi.enrollment,
            enrollmentDate: enrollmentApi.enrollmentDate,
            incidentDate: enrollmentApi.incidentDate,
        }))
        .first();

    const attributeValues: AttributeValue[] = teiApi.attributes.map((attrApi): AttributeValue => {
        const optionSet = attributesById[attrApi.attribute]?.optionSet;
        const option = optionSet && optionSet.options.find(option => option.code === attrApi.value);

        return {
            attribute: {
                id: attrApi.attribute,
                valueType: attrApi.valueType as DataElementType,
                ...(optionSet ? { optionSet } : {}),
            },
            value: attrApi.value,
            ...(option ? { optionId: option.id } : {}),
        };
    });

    return {
        program: { id: program.id },
        id: teiApi.trackedEntityInstance,
        orgUnit: { id: teiApi.orgUnit },
        disabled: teiApi.inactive || false,
        enrollment,
        attributeValues,
        relationships: fromApiRelationships(metadata, teiApi),
        geometry: getGeometry(teiApi),
    };
}

function getGeometry(teiApi: TrackedEntityInstanceApi): Geometry {
    switch (teiApi.featureType) {
        case "NONE":
            return { type: "none" };
        case "POINT": {
            const [longitude, latitude] = teiApi.geometry.coordinates;
            return { type: "point", coordinates: { latitude, longitude } };
        }
        case "POLYGON": {
            const coordinatesPairs = teiApi.geometry.coordinates[0] || [];
            const coordinatesList = coordinatesPairs.map(([longitude, latitude]) => ({ latitude, longitude }));
            return { type: "polygon", coordinatesList };
        }
    }
}
