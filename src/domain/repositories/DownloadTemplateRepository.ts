import { RelationshipOrgUnitFilter } from "../../data/repositories/download-template/DownloadTemplateDefaultRepository";
import { DataFormType } from "../entities/DataForm";
import { Id, NamedRef } from "../entities/Ref";
import { GeneratedTemplate } from "../entities/Template";
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

export interface DownloadTemplateRepository {
    getTemplate(programId: Id): GeneratedTemplate;
    getBuilderMetadata(teis: TrackedEntityInstance[]): Promise<BuilderMetadata>;
    getDataPackage(params: GetDataPackageParams): Promise<DataPackage>;
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
