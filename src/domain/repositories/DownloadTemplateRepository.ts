import {
    GetElementMetadataType,
    GetElementType,
    RelationshipOrgUnitFilter,
} from "../../data/repositories/download-template/DownloadTemplateDefaultRepository";
import { DataFormType } from "../entities/DataForm";
import { Id, NamedRef } from "../entities/Ref";
import { TrackedEntityInstance } from "../entities/TrackedEntityInstance";
import { DataPackage } from "../entities/data-entry/DataPackage";
import { Moment } from "moment";

export interface GetDataPackageParams {
    type: DataFormType;
    id: Id;
    orgUnits: Id[];
    periods?: Id[];
    startDate?: Moment;
    endDate?: Moment;
    translateCodes?: boolean;
    relationshipsOuFilter?: RelationshipOrgUnitFilter;
    filterTEIEnrollmentDate?: boolean;
    /** Max concurrent per-org-unit fetches (events / tracked entities). Defaults to 1 (sequential)
     *  when omitted — existing callers are unaffected unless they opt in. */
    fetchConcurrency?: number;
    /** Optional id -> human-readable label (e.g. country code) used only for progress logging
     *  during the per-org-unit fetch loops. Falls back to the raw org unit id when omitted or when
     *  a given id has no entry. */
    orgUnitLabels?: Record<Id, string>;
}

export interface GetElementMetadataParams {
    element: any;
    orgUnitIds: string[];
    downloadRelationships: boolean;
    startDate?: Date;
    endDate?: Date;
    populateStartDate?: Date;
    populateEndDate?: Date;
}

export interface DownloadTemplateRepository {
    getBuilderMetadata(teis: TrackedEntityInstance[]): Promise<BuilderMetadata>;
    getDataPackage(params: GetDataPackageParams): Promise<DataPackage>;
    getElement(type: string, id: string): Promise<GetElementType>;
    getElementMetadata(params: GetElementMetadataParams): Promise<GetElementMetadataType>;
}

export interface BuilderMetadata {
    orgUnits: Record<Id, NamedRef>;
    options: Record<Id, NamedRef & { code: string }>;
    categoryOptionCombos: Record<Id, NamedRef>;
}

export const emptyBuilderMetadata: BuilderMetadata = {
    orgUnits: {},
    options: {},
    categoryOptionCombos: {},
};
