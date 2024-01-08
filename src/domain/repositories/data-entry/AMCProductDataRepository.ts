import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { ProductDataTrackedEntity } from "../../entities/data-entry/amc/ProductDataTrackedEntity";
import { ProductRegisterProgramMetadata, ProgramStage } from "../../entities/data-entry/amc/ProductRegisterProgram";
import { RawSubstanceConsumptionCalculated } from "../../entities/data-entry/amc/RawSubstanceConsumptionCalculated";

export interface AMCProductDataRepository {
    validate(
        file: File,
        teiDataColumns: string[],
        rawProductDataColumns: string[]
    ): FutureData<{ isValid: boolean; rows: number; specimens: string[] }>;
    importCalculations(
        productDataTrackedEntities: ProductDataTrackedEntity[],
        rawSubstanceConsumptionCalculatedStageMetadata: ProgramStage,
        rawSubstanceConsumptionCalculatedData: RawSubstanceConsumptionCalculated[],
        orgUnitId: Id,
        orgUnitName: string
    ): FutureData<TrackerPostResponse>;
    getProductRegisterProgramMetadata(): FutureData<ProductRegisterProgramMetadata | undefined>;
    getProductRegisterAndRawProductConsumptionByProductIds(
        orgUnitId: Id,
        productIds: string[]
    ): FutureData<ProductDataTrackedEntity[]>;
}
