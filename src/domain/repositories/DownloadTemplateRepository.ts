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
