import { Id } from "../entities/Base";
import { FutureData } from "../entities/Future";
import { CategoryCombo } from "../entities/metadata/CategoryCombo";
import { DataSet } from "../entities/metadata/DataSet";
import { CodedRef } from "../entities/Ref";

export interface MetadataRepository {
    getOrgUnitsByCode(orgUnitCodes: string[]): FutureData<CodedRef[]>;
    getClinicsAndLabsInOrgUnitId(id: string): FutureData<Id[]>;
    getDataSet(id: string): FutureData<DataSet>;
    getCategoryCombination(id: string): FutureData<CategoryCombo>;
    validateDataSet(dataset: string, period: string, orgUnit: string, AOCs: string[]): FutureData<unknown>;
    getValidationRuleInstructions(ids: string[]): FutureData<{ id: string; instruction: string }[]>;
}
