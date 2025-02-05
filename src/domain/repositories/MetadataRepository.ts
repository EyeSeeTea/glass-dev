import { Id } from "../entities/Base";
import { FutureData } from "../entities/Future";
import { CategoryCombo } from "../entities/metadata/CategoryCombo";
import { DataSet } from "../entities/metadata/DataSet";
import { DataSetValidation } from "../entities/metadata/DataSetValidation";
import { CodedRef, NamedRef } from "../entities/Ref";

export interface MetadataRepository {
    getDataElementNames(dataElementIds: string[]): FutureData<NamedRef[]>;
    getD2Ids(ids: string[]): FutureData<NamedRef[]>;
    getOrgUnitsByCode(orgUnitCodes: string[]): FutureData<CodedRef[]>;
    getClinicOrLabNames(clinicLabIds: string[]): FutureData<{ id: string; name: string }[]>;
    getClinicsAndLabsInOrgUnitId(id: string): FutureData<Id[]>;
    getDataSet(id: string): FutureData<DataSet>;
    getCategoryCombination(id: string): FutureData<CategoryCombo>;
    getValidationsDataSet(
        dataset: string,
        period: string,
        orgUnit: string,
        attributeOptionCombos: string[]
    ): FutureData<DataSetValidation[]>;
    getValidationRuleInstructions(ids: string[]): FutureData<{ id: string; instruction: string }[]>;
}
