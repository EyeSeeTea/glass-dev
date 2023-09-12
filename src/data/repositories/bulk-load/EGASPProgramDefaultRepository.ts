import { D2Api, D2DataElementSchema, D2TrackedEntityType, SelectedPick } from "@eyeseetea/d2-api/2.34";
import { Id } from "../../../domain/entities/Ref";
import { Instance } from "../../entities/Instance";
import { getD2APiFromInstance } from "../../../utils/d2-api";
import { Future, FutureData } from "../../../domain/entities/Future";
import { apiToFuture } from "../../../utils/futures";
import { EGASP_PROGRAM_ID } from "../program-rule/ProgramRulesMetadataDefaultRepository";

export type DataElementType =
    | "TEXT"
    | "LONG_TEXT"
    | "LETTER"
    | "PHONE_NUMBER"
    | "EMAIL"
    | "BOOLEAN"
    | "TRUE_ONLY"
    | "DATE"
    | "DATETIME"
    | "TIME"
    | "NUMBER"
    | "UNIT_INTERVAL"
    | "PERCENTAGE"
    | "INTEGER"
    | "INTEGER_POSITIVE"
    | "INTEGER_NEGATIVE"
    | "INTEGER_ZERO_OR_POSITIVE"
    | "TRACKER_ASSOCIATE"
    | "USERNAME"
    | "COORDINATE"
    | "ORGANISATION_UNIT"
    | "AGE"
    | "URL"
    | "FILE_RESOURCE"
    | "IMAGE";
type TrackedEntityTypeApi = Pick<D2TrackedEntityType, "id" | "featureType">;
export interface DataElement {
    id: Id;
    name: string;
    valueType: DataElementType;
    categoryOptionCombos?: Array<{ id: Id; name: string }>;
    options: Array<{ id: Id; code: string }>;
}
export interface TrackedEntityType {
    id: Id;
    featureType: TrackedEntityTypeFeatureType;
}
export type TrackedEntityTypeFeatureType = "none" | "point" | "polygon";

export class EGASPProgramDefaultRepository {
    private api: D2Api;

    //TODO: @cache does not work with futures
    // I've created here an manual in memory cache to avoid many requests
    private inmemoryCache: Record<string, unknown> = {};

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    public getProgramEGASP(): FutureData<any> {
        const cacheKey = `EGASPprogram`;

        return this.getFromCacheOrRemote(
            cacheKey,
            apiToFuture(
                this.api.models.programs.get({
                    fields: EGASPProgramFields,
                    includeAncestors: true,
                    filter: { id: { eq: EGASP_PROGRAM_ID } },
                })
            ).map(response => {
                if (response.objects[0])
                    return {
                        type: response.objects[0].programType === "WITH_REGISTRATION" ? "trackerPrograms" : "programs",
                        id: response.objects[0].id,
                        attributeValues: response.objects[0].attributeValues,
                        name: response.objects[0].displayName,
                        periodType: "Daily",

                        readAccess: response.objects[0].access.read,

                        writeAccess: response.objects[0].access.write,
                        dataElements: response.objects[0].programStages.flatMap(({ programStageDataElements }) =>
                            programStageDataElements.map(({ dataElement }) => this.formatDataElement(dataElement))
                        ),
                        sections: response.objects[0].programStages.map(
                            ({ id, name, programStageDataElements, repeatable }) => ({
                                id,
                                name,
                                dataElements: programStageDataElements.map(({ dataElement }) =>
                                    this.formatDataElement(dataElement)
                                ),
                                repeatable,
                            })
                        ),
                        teiAttributes: response.objects[0].programTrackedEntityAttributes.map(
                            ({ trackedEntityAttribute }) => ({
                                id: trackedEntityAttribute.id,
                                name: trackedEntityAttribute.name,
                            })
                        ),
                        trackedEntityType: this.getTrackedEntityTypeFromApi(response.objects[0].trackedEntityType),
                    };
                else return undefined;
            })
        );
    }
    private formatDataElement = (de: SelectedPick<D2DataElementSchema, typeof dataElementFields>): DataElement => ({
        id: de.id,
        name: de.formName ?? de.name ?? "",
        valueType: de.valueType,
        categoryOptionCombos: de.categoryCombo?.categoryOptionCombos ?? [],
        options: de.optionSet?.options,
    });

    private getTrackedEntityTypeFromApi(trackedEntityType?: TrackedEntityTypeApi): TrackedEntityType | undefined {
        // TODO: Review when adding other types
        if (!trackedEntityType) return undefined;

        const d2FeatureType = trackedEntityType.featureType;
        const featureType = d2FeatureType === "POINT" ? "point" : d2FeatureType === "POLYGON" ? "polygon" : "none";
        return { id: trackedEntityType.id, featureType };
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

const dataElementFields = {
    id: true,
    formName: true,
    name: true,
    valueType: true,
    categoryCombo: { categoryOptionCombos: { id: true, name: true } },
    optionSet: { id: true, options: { id: true, code: true } },
} as const;

const EGASPProgramFields = {
    id: true,
    displayName: true,
    name: true,
    attributeValues: { value: true, attribute: { code: true } },
    programStages: {
        id: true,
        name: true,
        programStageDataElements: { dataElement: dataElementFields },
        repeatable: true,
    },
    programTrackedEntityAttributes: { trackedEntityAttribute: { id: true, name: true } },
    access: true,
    programType: true,
    trackedEntityType: { id: true, featureType: true },
} as const;
