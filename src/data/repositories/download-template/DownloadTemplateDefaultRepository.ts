import _ from "lodash";
import "lodash.product";
import { D2Api, D2Program, DataValueSetsGetResponse, Pager } from "@eyeseetea/d2-api/2.34";
import {
    BuilderMetadata,
    DownloadTemplateRepository,
    GetDataPackageParams,
} from "../../../domain/repositories/DownloadTemplateRepository";
import { Instance } from "../../entities/Instance";
import { getD2APiFromInstance } from "../../../utils/d2-api";
import { TeiOuRequest as TrackedEntityOURequestApi } from "@eyeseetea/d2-api/api/trackedEntityInstances";
import * as templates from "../../../domain/entities/data-entry/program-templates";
import { promiseMap } from "../../../utils/promises";
import { GeneratedTemplate } from "../../../domain/entities/Template";
import { Id, NamedRef, Ref } from "../../../domain/entities/Ref";
import { getTemplateId } from "../ExcelPopulateDefaultRepository";
import { D2RelationshipConstraint } from "@eyeseetea/d2-api/schemas";
import moment from "moment";
import { TrackedEntityInstance } from "../../../domain/entities/TrackedEntityInstance";
import { DataPackage } from "../../../domain/entities/data-entry/DataPackage";
import { EventsPackage, Event } from "../../../domain/entities/DhisDataPackage";
import { cache } from "../../../utils/cache";
import { getTrackedEntityInstances } from "../../dhis2/TrackedEntityInstances";

interface Program {
    id: Id;
    trackedEntityType: Ref;
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

interface RelationshipType {
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

interface PagedEventsApiResponse extends EventsPackage {
    pager: Pager;
}

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

interface CategoryOption {
    id: Id;
    startDate?: string;
    endDate?: String;
    organisationUnits: Ref[];
}

export class DownloadTemplateDefaultRepository implements DownloadTemplateRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    public getTemplate(programId: Id): GeneratedTemplate {
        const id = getTemplateId(programId);

        return _.values(templates)
            .map(TemplateClass => new TemplateClass())
            .filter(t => t.id === id)[0] as GeneratedTemplate;
    }

    @cache()
    private async getDefaultIds(filter?: string): Promise<string[]> {
        const response = await this.api
            .get<Record<string, { id: string }[]>>("/metadata", {
                filter: "identifiable:eq:default",
                fields: "id",
            })
            .getData();

        const metadata = _.pickBy(response, (_value, type) => !filter || type === filter);

        return _(metadata)
            .omit(["system"])
            .values()
            .flatten()
            .map(({ id }) => id)
            .value();
    }

    private buildProgramAttributeOptions(metadata: MetadataPackage, categoryComboId?: string): string[] {
        if (!categoryComboId) return [];

        // Get all the categories assigned to the categoryCombo of the program
        const categoryCombo = _.find(metadata?.categoryCombos, { id: categoryComboId });

        const categoryIds: string[] = _.compact(categoryCombo?.categories?.map(({ id }: MetadataItem) => id));

        // Get all the category options for each category on the categoryCombo
        const categories = _.compact(categoryIds.map(id => _.find(metadata?.categories, { id })));

        // Cartesian product to fix bug in DHIS2 with multiple categories in a combo
        const optionsByCategory = categories.map(({ categoryOptions }) => categoryOptions.map(({ id }) => id));

        //@ts-ignore Polyfilled lodash product
        const categoryOptions = _.product(...optionsByCategory).map(items => items.join(";"));

        return categoryOptions;
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
            case "dataSets":
                return this.getDataSetPackage(params);
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

    private async getDataSetPackage({
        id,
        orgUnits,
        periods = [],
        startDate,
        endDate,
        translateCodes = true,
    }: GetDataPackageParams): Promise<DataPackage> {
        const defaultIds = await this.getDefaultIds();
        const metadata = await this.api.get<MetadataPackage>(`/dataSets/${id}/metadata`).getData();
        const response = await promiseMap(_.chunk(orgUnits, 200), async orgUnit => {
            const query = (period?: string[]): Promise<DataValueSetsGetResponse> =>
                this.api.dataValues
                    .getSet({
                        dataSet: [id],
                        orgUnit,
                        period,
                        startDate: startDate?.format("YYYY-MM-DD"),
                        endDate: endDate?.format("YYYY-MM-DD"),
                    })
                    .getData();

            return periods.length > 0 ? await promiseMap(_.chunk(periods, 200), query) : [await query()];
        });

        return {
            type: "dataSets",
            dataEntries: _(response)
                .flatten()
                .flatMap(({ dataValues = [] }) => dataValues)
                .groupBy(({ period, orgUnit, attributeOptionCombo }) =>
                    [period, orgUnit, attributeOptionCombo].join("-")
                )
                .map((dataValues, key) => {
                    const [period, orgUnit, attribute] = key.split("-");
                    if (!period || !orgUnit) return undefined;

                    return {
                        type: "aggregated" as const,
                        dataForm: id,
                        orgUnit,
                        period,
                        attribute: attribute && defaultIds.includes(attribute) ? undefined : attribute,
                        dataValues: dataValues.map(({ dataElement, categoryOptionCombo, value, comment }) => ({
                            dataElement,
                            category: defaultIds.includes(categoryOptionCombo) ? undefined : categoryOptionCombo,
                            value: this.formatDataValue(dataElement, value, metadata, translateCodes),
                            comment,
                        })),
                    };
                })
                .compact()
                .value(),
        };
    }

    private async getProgramPackage({
        id,
        orgUnits,
        startDate,
        endDate,
        translateCodes = true,
    }: GetDataPackageParams): Promise<DataPackage> {
        const metadata = await this.api.get<MetadataPackage>(`/programs/${id}/metadata`).getData();
        const categoryComboId: string = _.find(metadata.programs, { id })?.categoryCombo.id;

        const categoryOptions = this.buildProgramAttributeOptions(metadata, categoryComboId);
        if (categoryOptions.length === 0) {
            throw new Error(`Could not find category options for the program ${id}`);
        }

        const getEvents = (orgUnit: Id, categoryOptionId: Id, page: number): Promise<PagedEventsApiResponse> => {
            // DHIS2 bug if we do not provide CC and COs, endpoint only works with ALL authority
            return this.api
                .get<PagedEventsApiResponse>("/events", {
                    program: id,
                    orgUnit,
                    paging: true,
                    totalPages: true,
                    page,
                    pageSize: 250,
                    attributeCc: categoryComboId,
                    attributeCos: categoryOptionId,
                    startDate: startDate?.format("YYYY-MM-DD"),
                    endDate: endDate?.format("YYYY-MM-DD"),
                    cache: Math.random(),
                    // @ts-ignore FIXME: Add property in d2-api
                    fields: "*",
                })
                .getData();
        };

        const programEvents: Event[] = [];

        for (const orgUnit of orgUnits) {
            for (const categoryOptionId of categoryOptions) {
                const { events, pager } = await getEvents(orgUnit, categoryOptionId, 1);
                programEvents.push(...events);

                await promiseMap(_.range(2, pager.pageCount + 1, 1), async page => {
                    const { events } = await getEvents(orgUnit, categoryOptionId, page);
                    programEvents.push(...events);
                });
            }
        }

        return {
            type: "programs",
            dataEntries: _(programEvents)
                .map(
                    ({
                        event,
                        orgUnit,
                        eventDate,
                        attributeOptionCombo,
                        coordinate,
                        dataValues,
                        trackedEntityInstance,
                        programStage,
                    }) => ({
                        id: event,
                        dataForm: id,
                        orgUnit,
                        period: moment(eventDate).format("YYYY-MM-DD"),
                        attribute: attributeOptionCombo,
                        coordinate,
                        trackedEntityInstance,
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
        const { element, elementMetadata, orgUnitIds } = options;

        if (element.type === "dataSets") {
            const categoryOptions = await this.getCategoryOptions(this.api);
            const categoryOptionIdsToInclude = this.getCategoryOptionIdsToInclude(
                element,
                orgUnitIds,
                categoryOptions,
                options
            );

            const categoryOptionCombosFiltered = elementMetadata.categoryOptionCombos.filter(coc =>
                _(coc.categoryOptions).every(categoryOption => {
                    return categoryOptionIdsToInclude.has(categoryOption.id);
                })
            );

            return { ...elementMetadata, categoryOptionCombos: categoryOptionCombosFiltered };
        } else {
            return elementMetadata;
        }
    }

    private getCategoryOptionIdsToInclude(
        element: Element,
        orgUnitIds: string[],
        categoryOptions: CategoryOption[],
        options: { startDate: Date | undefined; endDate: Date | undefined }
    ) {
        const dataSetOrgUnitIds = element.organisationUnits.map(ou => ou.id);

        const orgUnitIdsToInclude = new Set(
            _.isEmpty(orgUnitIds) ? dataSetOrgUnitIds : _.intersection(orgUnitIds, dataSetOrgUnitIds)
        );

        const startDate = options.startDate?.toISOString();
        const endDate = options.endDate?.toISOString();

        const categoryOptionIdsToInclude = new Set(
            categoryOptions
                .filter(categoryOption => {
                    const noStartDateIntersect =
                        startDate && categoryOption.endDate && startDate > categoryOption.endDate;
                    const noEndDateIntersect =
                        endDate && categoryOption.startDate && endDate < categoryOption.startDate;
                    const dateCondition = !noStartDateIntersect && !noEndDateIntersect;

                    const categoryOptionOrgUnitCondition =
                        _.isEmpty(categoryOption.organisationUnits) ||
                        _(categoryOption.organisationUnits).some(orgUnit => orgUnitIdsToInclude.has(orgUnit.id));

                    return dateCondition && categoryOptionOrgUnitCondition;
                })
                .map(categoryOption => categoryOption.id)
        );
        return categoryOptionIdsToInclude;
    }

    private async getCategoryOptions(api: D2Api): Promise<CategoryOption[]> {
        const { categoryOptions } = await api.metadata
            .get({
                categoryOptions: {
                    fields: {
                        id: true,
                        startDate: true,
                        endDate: true,
                        organisationUnits: { id: true },
                    },
                },
            })
            .getData();

        return categoryOptions;
    }
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
