import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { ProductDataTrackedEntity } from "../../entities/data-entry/amc/ProductDataTrackedEntity";
import { ProductRegisterProgramMetadata } from "../../entities/data-entry/amc/ProductRegisterProgram";

export interface AMCProductDataRepository {
    validate(
        file: File,
        teiDataColumns: string[],
        rawProductDataColumns: string[]
    ): FutureData<{ isValid: boolean; rows: number; specimens: string[] }>;
    getProductRegisterProgramMetadata(): FutureData<ProductRegisterProgramMetadata | undefined>;
    getProductRegisterAndRawProductConsumptionByProductIds(
        orgUnitId: Id,
        productIds: string[]
    ): FutureData<ProductDataTrackedEntity[]>;
}
