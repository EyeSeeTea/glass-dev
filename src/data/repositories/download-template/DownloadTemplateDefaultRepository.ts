import _ from "lodash";
import { D2Api, D2Program } from "@eyeseetea/d2-api/2.34";
import {
    BuilderMetadata,
    DownloadTemplateRepository,
    GetDataPackageParams,
} from "../../../domain/repositories/DownloadTemplateRepository";
import { Instance } from "../../entities/Instance";
import { getD2APiFromInstance } from "../../../utils/d2-api";
import { TeiOuRequest as TrackedEntityOURequestApi } from "@eyeseetea/d2-api/api/trackedEntityInstances";
import { promiseMap } from "../../../utils/promises";
import { Id, NamedRef, Ref } from "../../../domain/entities/Ref";
import { D2RelationshipConstraint } from "@eyeseetea/d2-api/schemas";
import { Moment } from "moment";
import {
    Attribute,
    AttributeValue,
    Enrollment,
    TrackedEntityInstance,
} from "../../../domain/entities/TrackedEntityInstance";
import { DataPackage } from "../../../domain/entities/data-entry/DataPackage";
import moment from "moment";
import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import { D2TrackerTrackedEntity } from "@eyeseetea/d2-api/api/trackerTrackedEntities";
import { DataElementType } from "../../../domain/entities/DataForm";

export interface Program {
    id: Id;
    trackedEntityType: Ref;
    attributes: Attribute[];
}
export type RelationshipConstraint = RelationshipConstraintTei | RelationshipConstraintEventInProgram;

export type RelationshipOrgUnitFilter = TrackedEntityOURequestApi["ouMode"];

export interface RelationshipConstraintTei {
    type: "tei";
    name: string;
    program?: Ref;
    teis: Ref[]; // Selectable TEIs for this constraint
}

export interface RelationshipConstraintEventInProgram {
    type: "eventInProgram";
    program: NamedRef;
    programStage?: NamedRef;
    events: Ref[];
}

export interface RelationshipType {
    id: Id;
    name: string;
    constraints: {
        from: RelationshipConstraint;
        to: RelationshipConstraint;
    };
}
interface RelationshipMetadata {
    relationshipTypes: RelationshipType[];
}

interface ProgramFilters {
    organisationUnits?: Ref[];
    startDate?: Date;
    endDate?: Date;
    ouMode?: RelationshipOrgUnitFilter;
}

interface MetadataItem {
    id: string;
    code: string;
    categoryOptions: MetadataItem[];
    [key: string]: any;
}

interface CategoryOptionCombo {
    categoryOptions: Ref[];
}

interface ElementMetadata {
    categoryOptionCombos: CategoryOptionCombo[];
}

type MetadataPackage = Record<string, MetadataItem[] | undefined>;

interface Element {
    type: "dataSets" | "programs";
    organisationUnits: Ref[];
}

export type GetElementType = D2Program & { type: string };

export type GetElementMetadataType = {
    element: any;
    metadata: RelationshipMetadata | {};
    elementMetadata: Map<any, any>;
    organisationUnits: {
        id: string;
        displayName: string;
        code?: string | undefined;
        translations: unknown;
        type: string;
    }[];
    rawMetadata: any;
};

export interface GetOptions {
    api: D2Api;
    program: Ref;
    orgUnits: Ref[];
    pageSize?: number;
    enrollmentStartDate?: Moment;
    enrollmentEndDate?: Moment;
    relationshipsOuFilter?: RelationshipOrgUnitFilter;
}

export class DownloadTemplateDefaultRepository implements DownloadTemplateRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    private formatDataValue(
        dataElement: string,
        value: string | number | boolean | undefined | null,
        metadata: MetadataPackage,
        translateCodes: boolean
    ): string | number | boolean {
        if (_.isNil(value)) return "";

        const optionSet = _.find(metadata.dataElements, { id: dataElement })?.optionSet?.id;
        if (!translateCodes || !optionSet) return value;

        // Format options from CODE to UID
        const options = _.filter(metadata.options, { optionSet: { id: optionSet } });
        const optionValue = options.find(({ code }) => code === value);
        return optionValue?.id ?? value;
    }

    public async getBuilderMetadata(teis: TrackedEntityInstance[]): Promise<BuilderMetadata> {
        const orgUnitIds = teis.map(tei => tei.orgUnit.id);
        const orgUnitIdsList = _.chunk(orgUnitIds, 250);

        const orgUnits: NamedRef[] = _.flatten(
            await promiseMap(orgUnitIdsList, async orgUnitIdsGroup => {
                const { objects } = await this.api.models.organisationUnits
                    .get({
                        fields: { id: true, name: true },
                        filter: { id: { in: orgUnitIdsGroup } },
                        paging: false,
                    })
                    .getData();
                return objects;
            })
        );

        const { objects: apiOptions } = await this.api.models.options
            .get({ fields: { id: true, name: true, code: true }, paging: false })
            .getData();

        const customOptions = [
            { id: "true", name: "Yes", code: "true" },
            { id: "false", name: "No", code: "false" },
        ];

        const options = [...apiOptions, ...customOptions];

        const programIds = _.uniq(teis.map(tei => tei.program.id));

        const { objects: programs } = await this.api.models.programs
            .get({
                fields: {
                    id: true,
                    categoryCombo: { categoryOptionCombos: { id: true, name: true } },
                },
                paging: false,
                filter: { id: { in: programIds } },
            })
            .getData();

        const cocs = _.flatMap(programs, program => program.categoryCombo.categoryOptionCombos);

        return {
            orgUnits: _.keyBy(orgUnits, ou => ou.id),
            options: _.keyBy(options, opt => opt.id),
            categoryOptionCombos: _.keyBy(cocs, coc => coc.id),
        };
    }

    public async getDataPackage(params: GetDataPackageParams): Promise<DataPackage> {
        switch (params.type) {
            // case "dataSets":
            //     return this.getDataSetPackage(params);
            case "programs":
                return this.getProgramPackage(params);
            case "trackerPrograms":
                return this.getTrackerProgramPackage(params);
            default:
                throw new Error(`Unsupported type ${params.type} for data package`);
        }
    }

    public async getElement(type: string, id: string): Promise<GetElementType> {
        const fields = [
            "id",
            "displayName",
            "organisationUnits[id,path]",
            "attributeValues[attribute[code],value]",
            "categoryCombo",
            "dataSetElements",
            "formType",
            "sections[id,sortOrder,dataElements[id]]",
            "periodType",
            "programStages[id,access]",
            "programType",
            "enrollmentDateLabel",
            "incidentDateLabel",
            "trackedEntityType[id,featureType]",
            "captureCoordinates",
            "programTrackedEntityAttributes[trackedEntityAttribute[id,name,valueType,confidential,optionSet[id,name,options[id]]]],",
        ].join(",");
        const response = await this.api.get<D2Program>(`/programs/${id}`, { fields }).getData();
        return { ...response, type };
    }

    public async getElementMetadata({
        element,
        orgUnitIds,
        downloadRelationships,
        populateStartDate,
        populateEndDate,
        startDate,
        endDate,
    }: {
        element: any;
        orgUnitIds: string[];
        downloadRelationships: boolean;
        startDate?: Date;
        endDate?: Date;
        populateStartDate?: Date;
        populateEndDate?: Date;
    }): Promise<GetElementMetadataType> {
        const elementMetadataMap = new Map();
        const elementMetadata = await this.api.get<ElementMetadata>(`/programs/${element.id}/metadata.json`).getData();

        const rawMetadata = await this.filterRawMetadata({ element, elementMetadata, orgUnitIds, startDate, endDate });

        _.forOwn(rawMetadata, (value, type) => {
            if (Array.isArray(value)) {
                _.forEach(value, (object: any) => {
                    if (object.id) elementMetadataMap.set(object.id, { ...object, type });
                });
            }
        });

        // FIXME: This is needed for getting all possible org units for a program/dataSet
        const requestOrgUnits = orgUnitIds;

        const responses = await promiseMap(_.chunk(_.uniq(requestOrgUnits), 400), orgUnits =>
            this.api
                .get<{
                    organisationUnits: { id: string; displayName: string; code?: string; translations: unknown }[];
                }>("/metadata", {
                    fields: "id,displayName,code,translations",
                    filter: `id:in:[${orgUnits}]`,
                })
                .getData()
        );

        const organisationUnits = _.flatMap(responses, ({ organisationUnits }) =>
            organisationUnits.map(orgUnit => ({
                type: "organisationUnits",
                ...orgUnit,
            }))
        );

        const metadata =
            element.type === "trackerPrograms" && downloadRelationships
                ? await getRelationshipMetadata(element, this.api, {
                      startDate: populateStartDate,
                      endDate: populateEndDate,
                  })
                : {};

        return { element, metadata, elementMetadata: elementMetadataMap, organisationUnits, rawMetadata };
    }

    private async getProgramPackage({
        id,
        orgUnits,
        startDate,
        endDate,
        translateCodes = true,
    }: GetDataPackageParams): Promise<DataPackage> {
        const metadata = await this.api.get<MetadataPackage>(`/programs/${id}/metadata`).getData();

        const programEvents: D2TrackerEvent[] = [];

        for (const orgUnit of orgUnits) {
            const events = await this.getEventsForPopulatingBLTemplate(id, orgUnit, startDate, endDate);
            programEvents.push(...events);
        }

        return {
            type: "programs",
            dataEntries: _(programEvents)
                .map(
                    ({
                        event,
                        orgUnit,
                        occurredAt,
                        attributeOptionCombo,
                        dataValues,
                        trackedEntity,
                        programStage,
                    }) => ({
                        id: event,
                        dataForm: id,
                        orgUnit,
                        period: moment(occurredAt).format("YYYY-MM-DD"),
                        attribute: attributeOptionCombo,
                        trackedEntityInstance: trackedEntity,
                        programStage,
                        dataValues:
                            dataValues?.map(({ dataElement, value }) => ({
                                dataElement,
                                value: this.formatDataValue(dataElement, value, metadata, translateCodes),
                            })) ?? [],
                    })
                )
                .value(),
        };
    }

    private async getTrackerProgramPackage(params: GetDataPackageParams): Promise<DataPackage> {
        const { api } = this;

        const dataPackage = await this.getProgramPackage(params);
        const orgUnits = params.orgUnits.map(id => ({ id }));
        const program = { id: params.id };
        const trackedEntityInstances = await getTrackedEntityInstances({
            api,
            program,
            orgUnits,
            enrollmentStartDate: params.filterTEIEnrollmentDate ? params.startDate : undefined,
            enrollmentEndDate: params.filterTEIEnrollmentDate ? params.endDate : undefined,
            relationshipsOuFilter: params.relationshipsOuFilter,
            // @ts-ignore FIXME: Add property in d2-api
            fields: "*",
        });

        return {
            type: "trackerPrograms",
            trackedEntityInstances,
            dataEntries: dataPackage.dataEntries,
        };
    }

    private async getEventsForPopulatingBLTemplate(
        program: Id,
        orgUnit: Id,
        startDate: Moment | undefined,
        endDate: Moment | undefined
    ): Promise<D2TrackerEvent[]> {
        const d2TrackerEvents: D2TrackerEvent[] = [];

        const pageSize = 250;
        let page = 1;
        let result;
        try {
            do {
                result = await this.api.tracker.events
                    .get({
                        fields: {
                            $owner: true,
                            event: true,
                            dataValues: true,
                            orgUnit: true,
                            occurredAt: true,
                            attributeOptionCombo: true,
                            latitude: true,
                            longitude: true,
                            trackedEntityInstance: true,
                            programStage: true,
                        },
                        program: program,
                        orgUnit: orgUnit,
                        totalPages: true,
                        page,
                        pageSize: 250,
                        occurredAfter: startDate?.format("YYYY-MM-DD"),
                        occurredBefore: endDate?.format("YYYY-MM-DD"),
                    })
                    .getData();
                if (!result.total) {
                    throw new Error(`Error getting paginated events of program ${program} and organisation ${orgUnit}`);
                }
                d2TrackerEvents.push(...result.instances);
                page++;
            } while (result.page < Math.ceil((result.total as number) / pageSize));
            return d2TrackerEvents;
        } catch {
            return [];
        }
    }

    /* Return the raw metadata filtering out non-relevant category option combos.

    /api/dataSets/ID/metadata returns categoryOptionCombos that may not be relevant for the
    data set. Here we filter out category option combos with categoryOptions not matching these
    conditions:

     - categoryOption.startDate/endDate outside the startDate -> endDate interval
     - categoryOption.orgUnit EMPTY or assigned to the dataSet orgUnits (intersected with the requested).
*/
    private async filterRawMetadata(options: {
        element: Element;
        elementMetadata: ElementMetadata;
        orgUnitIds: Id[];
        startDate: Date | undefined;
        endDate: Date | undefined;
    }): Promise<ElementMetadata & unknown> {
        const { elementMetadata } = options;

        // if (element.type === "dataSets") {
        //     const categoryOptions = await this.getCategoryOptions(this.api);
        //     const categoryOptionIdsToInclude = this.getCategoryOptionIdsToInclude(
        //         element,
        //         orgUnitIds,
        //         categoryOptions,
        //         options
        //     );

        //     const categoryOptionCombosFiltered = elementMetadata.categoryOptionCombos.filter(coc =>
        //         _(coc.categoryOptions).every(categoryOption => {
        //             return categoryOptionIdsToInclude.has(categoryOption.id);
        //         })
        //     );

        //     return { ...elementMetadata, categoryOptionCombos: categoryOptionCombosFiltered };
        // } else {
        return elementMetadata;
        // }
    }
}

async function getTrackedEntityInstances(options: GetOptions): Promise<TrackedEntityInstance[]> {
    const { api, orgUnits, enrollmentStartDate, enrollmentEndDate, relationshipsOuFilter = "CAPTURE" } = options;
    if (_.isEmpty(orgUnits)) return [];

    const program = await getProgram(api, options.program.id);
    if (!program) return [];

    const metadata = await getRelationshipMetadata(program, api, {
        organisationUnits: orgUnits,
        ouMode: relationshipsOuFilter,
    });

    // Get TEIs for the first page:
    const apiTeis: D2TrackerTrackedEntity[] = [];

    for (const orgUnit of orgUnits) {
        const trackedEntityInstances = await getTeisFromApi({
            api,
            program,
            orgUnit,
            enrollmentStartDate,
            enrollmentEndDate,
        });
        apiTeis.push(...trackedEntityInstances);
    }

    return apiTeis.map(tei => buildTei(metadata, program, tei));
}

async function getProgram(api: D2Api, id: Id): Promise<Program | undefined> {
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
        trackedEntityType: { id: apiProgram.trackedEntityType?.id },
        attributes: apiProgram.programTrackedEntityAttributes.map(
            ({ trackedEntityAttribute }) => trackedEntityAttribute
        ),
    };

    return program;
}
export async function getRelationshipMetadata(
    program: Program,
    api: D2Api,
    filters?: ProgramFilters
): Promise<RelationshipMetadata> {
    const {
        trackedEntityTypes,
        relationshipTypes: allRelationshipTypes,
        programs,
    } = await api.metadata
        .get({
            trackedEntityTypes: { fields: { id: true, name: true } },
            relationshipTypes: {
                fields: {
                    id: true,
                    name: true,
                    fromConstraint: true,
                    toConstraint: true,
                },
            },
            programs: { fields: { id: true, name: true, programStages: { id: true, name: true } } },
        })
        .getData();

    const relationshipTypesWithTeis = await promiseMap(allRelationshipTypes, async relType => {
        const isProgramAssociatedWithSomeConstraint =
            isProgramAssociatedWithTeiConstraint(program, relType.fromConstraint) ||
            isProgramAssociatedWithTeiConstraint(program, relType.toConstraint);

        if (!isProgramAssociatedWithSomeConstraint) return;

        const fromConstraint = await getConstraint(api, trackedEntityTypes, programs, relType.fromConstraint, filters);
        const toConstraint = await getConstraint(api, trackedEntityTypes, programs, relType.toConstraint, filters);

        return fromConstraint && toConstraint
            ? { id: relType.id, name: relType.name, constraints: { from: fromConstraint, to: toConstraint } }
            : undefined;
    });

    return { relationshipTypes: _.compact(relationshipTypesWithTeis) };
}

async function getTeisFromApi(options: {
    api: D2Api;
    program: Program;
    orgUnit: Ref;
    enrollmentStartDate: Moment | undefined;
    enrollmentEndDate: Moment | undefined;
}): Promise<D2TrackerTrackedEntity[]> {
    const trackedEntities: D2TrackerTrackedEntity[] = [];
    const { api, program, orgUnit, enrollmentStartDate, enrollmentEndDate } = options;

    const pageSize = 250;
    let page = 1;
    let result;
    try {
        do {
            result = await api.tracker.trackedEntities
                .get({
                    program: program.id,
                    orgUnit: orgUnit.id,
                    pageSize,
                    page,
                    totalPages: true,
                    fields: {
                        trackedEntity: true,
                        orgUnit: true,
                        inactive: true,
                        attributes: true,
                        enrollments: true,
                        relationships: true,
                        featureType: true,
                        geometry: true,
                    },

                    enrollmentEnrolledAfter: enrollmentStartDate?.format("YYYY-MM-DD") ?? "",
                    enrollmentEnrolledBefore: enrollmentEndDate?.format("YYYY-MM-DD") ?? "",
                })
                .getData();
            if (!result.total) {
                throw new Error(`Error getting paginated events of program ${program} and organisation ${orgUnit}`);
            }
            trackedEntities.push(...result.instances);
            page++;
        } while (result.page < Math.ceil((result.total as number) / pageSize));
        return trackedEntities;
    } catch {
        return [];
    }
}

function buildTei(
    metadata: RelationshipMetadata,
    program: Program,
    teiApi: D2TrackerTrackedEntity
): TrackedEntityInstance {
    const orgUnit = { id: teiApi.orgUnit };
    const attributesById = _.keyBy(program.attributes, attribute => attribute.id);

    const enrollment: Enrollment | undefined = _(teiApi.enrollments)
        .filter(e => e.program === program.id && orgUnit.id === e.orgUnit)
        .map(enrollmentApi => ({
            id: enrollmentApi.enrollment,
            enrollmentDate: enrollmentApi.enrolledAt,
            incidentDate: enrollmentApi.occurredAt,
        }))
        .first();

    const attributeValues: AttributeValue[] =
        teiApi.attributes?.map((attrApi): AttributeValue => {
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
        }) ?? [];

    return {
        program: { id: program.id },
        id: teiApi.trackedEntity ?? "",
        orgUnit: { id: teiApi.orgUnit ?? "" },
        disabled: teiApi.inactive ? true : false,
        enrollment: enrollment,
        attributeValues,
        relationships:
            teiApi.relationships?.map(relationship => ({
                id: relationship.relationship,
                typeId: relationship.relationshipType,
                typeName: relationship.relationshipName,
                fromId: relationship.from.trackedEntity?.trackedEntity ?? "",
                toId: relationship.to.event?.event ?? "",
            })) ?? [],
        geometry: { type: "none" },
    };
}

function isProgramAssociatedWithTeiConstraint(program: Program, constraint: D2RelationshipConstraint): boolean {
    switch (constraint.relationshipEntity) {
        case "TRACKED_ENTITY_INSTANCE":
            return (
                constraint.trackedEntityType.id === program.trackedEntityType.id &&
                (!constraint.program || constraint.program.id === program.id)
            );
        case "PROGRAM_STAGE_INSTANCE":
            return true;
        default:
            return false;
    }
}

export function memoizeAsync<This, Args extends any[], U>(fn: (...args: Args) => Promise<U>) {
    const map = new Map<string, U>();

    return async function (this: This, ...args: Args): Promise<U> {
        const key = JSON.stringify(args);
        const cachedValue = map.get(key);

        if (cachedValue !== undefined) {
            return cachedValue;
        } else {
            const result = await fn.apply(this, args);
            map.set(key, result);
            return result;
        }
    };
}
type ProgramInfo = NamedRef & { programStages: NamedRef[] };
const getConstraint = memoizeAsync(
    async (
        api: D2Api,
        trackedEntityTypes: NamedRef[],
        programs: ProgramInfo[],
        constraint: D2RelationshipConstraint,
        filters?: ProgramFilters
    ): Promise<RelationshipConstraint | undefined> => {
        const programsById = _.keyBy(programs, program => program.id);
        const programsDataByProgramStageId = _(programs)
            .flatMap(program =>
                program.programStages.map(programStage => {
                    const programsData = { program, programStage };
                    return [programStage.id, programsData] as [Id, typeof programsData];
                })
            )
            .fromPairs()
            .value();

        switch (constraint.relationshipEntity) {
            case "TRACKED_ENTITY_INSTANCE":
                return getConstraintForTypeTei(trackedEntityTypes, constraint);
            case "PROGRAM_STAGE_INSTANCE": {
                if ("program" in constraint) {
                    const program = programsById[constraint.program.id];
                    return getConstraintForTypeProgram(api, program, undefined, filters);
                } else {
                    const data = programsDataByProgramStageId[constraint.programStage.id];
                    return getConstraintForTypeProgram(api, data?.program, data?.programStage, filters);
                }
            }
        }
    }
);

async function getConstraintForTypeTei(
    trackedEntityTypes: NamedRef[],
    constraint: Extract<D2RelationshipConstraint, { relationshipEntity: "TRACKED_ENTITY_INSTANCE" }>
): Promise<RelationshipConstraint> {
    const trackedEntityTypesById = _.keyBy(trackedEntityTypes, obj => obj.id);

    const teis: Ref[] = [];
    const name = trackedEntityTypesById[constraint.trackedEntityType.id]?.name ?? "Unknown";

    return { type: "tei", name, program: constraint.program, teis };
}

async function getConstraintForTypeProgram(
    api: D2Api,
    program?: ProgramInfo,
    programStage?: NamedRef,
    filters?: ProgramFilters
): Promise<RelationshipConstraint | undefined> {
    if (!program) return undefined;
    const { organisationUnits = [], startDate, endDate } = filters ?? {};

    const events = await promiseMap(organisationUnits, async orgUnit => {
        const { events } = await api.events
            .getAll({
                fields: {
                    $all: true,
                },
                program: program.id,
                programStage: programStage?.id,
                orgUnit: orgUnit.id,
                startDate: startDate ? moment(startDate).format("YYYY-MM-DD") : undefined,
                endDate: endDate ? moment(endDate).format("YYYY-MM-DD") : undefined,
            })
            .getData();

        return events;
    });

    return {
        type: "eventInProgram",
        program,
        programStage,
        events: _.flatten(events).map(({ event }) => ({ id: event })),
    };
}
