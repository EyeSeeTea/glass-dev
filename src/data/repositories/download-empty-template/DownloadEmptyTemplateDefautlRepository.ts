import { D2Api } from "@eyeseetea/d2-api/2.34";
import { DownloadEmptyTemplateRepository } from "../../../domain/repositories/DownloadEmptyTemplateRepository";
import { Instance } from "../../entities/Instance";
import { getD2APiFromInstance } from "../../../utils/d2-api";
import * as templates from "../../../domain/entities/data-entry/program-templates";
import { SheetBuilder } from "./sheetBuilder";
import { promiseMap } from "../../../utils/promises";
import { GeneratedTemplate } from "../../../domain/entities/Template";
import { Id, NamedRef, Ref } from "../../../domain/entities/Ref";
import { getTemplateId } from "../ExcelPopulateDefaultRepository";
import { D2RelationshipConstraint } from "@eyeseetea/d2-api/schemas";

interface Program {
    id: Id;
    trackedEntityType: Ref;
}
export type RelationshipConstraint = RelationshipConstraintTei | RelationshipConstraintEventInProgram;

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

export class DownloadEmptyTemplateDefautlRepository implements DownloadEmptyTemplateRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    async getEmptyTemplate(
        programId: Id,
        orgUnits: string[],
        settings: Record<string, any>,
        downloadRelationships: boolean,
        useCodesForMetadata: boolean,
        formType: string
    ): Promise<File> {
        const template = this.getTemplate(programId);
        const element = await this.getElement(this.api, formType, programId);

        const result = await this.getElementMetadata({
            api: this.api,
            element,
            orgUnitIds: orgUnits,
            downloadRelationships,
        });

        // FIXME: Legacy code, sheet generator
        const sheetBuilder = new SheetBuilder({
            ...result,
            language: "en",
            template: template,
            settings: settings,
            downloadRelationships: true,
            splitDataEntryTabsBySection: false,
            useCodesForMetadata: useCodesForMetadata,
        });

        const workbook = await sheetBuilder.generate(programId);

        const file = await workbook.writeToBuffer();

        return file;
    }

    private getTemplate(programId: Id): GeneratedTemplate {
        const id = getTemplateId(programId);

        return _.values(templates)
            .map(TemplateClass => new TemplateClass())
            .filter(t => t.id === id)[0] as GeneratedTemplate;
    }

    async getElement(api: D2Api, type: string, id: string) {
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
        const response = await api.get<any>(`/programs/${id}`, { fields }).getData();
        return { ...response, type };
    }

    async getElementMetadata({
        api,
        element,
        orgUnitIds,
        downloadRelationships,
    }: {
        api: D2Api;
        element: any;
        orgUnitIds: string[];
        downloadRelationships: boolean;
    }) {
        const elementMetadataMap = new Map();
        const elementMetadata = await this.api.get(`/programs/${element.id}/metadata.json`).getData();

        const rawMetadata = elementMetadata;

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
            api
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
                ? await getRelationshipMetadata(element, api)
                : {};

        return { element, metadata, elementMetadata: elementMetadataMap, organisationUnits, rawMetadata };
    }
}

export async function getRelationshipMetadata(program: Program, api: D2Api): Promise<RelationshipMetadata> {
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

        const fromConstraint = await getConstraint(api, trackedEntityTypes, programs, relType.fromConstraint);
        const toConstraint = await getConstraint(api, trackedEntityTypes, programs, relType.toConstraint);

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
        constraint: D2RelationshipConstraint
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
                    return getConstraintForTypeProgram(program);
                } else {
                    const data = programsDataByProgramStageId[constraint.programStage.id];
                    return getConstraintForTypeProgram(data?.program, data?.programStage);
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
    program?: ProgramInfo,
    programStage?: NamedRef
): Promise<RelationshipConstraint | undefined> {
    if (!program) return undefined;

    return {
        type: "eventInProgram",
        program,
        programStage,
        events: [],
    };
}
