import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { ProductDataTrackedEntity } from "../../entities/data-entry/amc/ProductDataTrackedEntity";
import { ProductRegisterProgramMetadata, ProgramStage } from "../../entities/data-entry/amc/ProductRegisterProgram";
import { RawSubstanceConsumptionCalculated } from "../../entities/data-entry/amc/RawSubstanceConsumptionCalculated";
import { ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";
import { ImportSummary } from "../../entities/data-entry/ImportSummary";

export interface AMCProductDataRepository {
    validate(
        file: File,
        teiDataColumns: string[],
        rawProductDataColumns: string[]
    ): FutureData<{ isValid: boolean; rows: number; specimens: string[] }>;
    importCalculations(
        importStrategy: ImportStrategy,
        productDataTrackedEntities: ProductDataTrackedEntity[],
        rawSubstanceConsumptionCalculatedStageMetadata: ProgramStage,
        rawSubstanceConsumptionCalculatedData: RawSubstanceConsumptionCalculated[],
        orgUnitId: Id,
        period: string
    ): FutureData<ImportSummary>;
    getProductRegisterProgramMetadata(): FutureData<ProductRegisterProgramMetadata | undefined>;
    getProductRegisterAndRawProductConsumptionByProductIds(
        orgUnitId: Id,
        productIds: string[]
    ): FutureData<ProductDataTrackedEntity[]>;
    getAllProductRegisterAndRawProductConsumptionByPeriod(
        orgUnitId: Id,
        period: string
    ): FutureData<ProductDataTrackedEntity[]>;
    getTrackedEntityProductIdsByOUAndPeriod(orgUnitId: Id, period: string): FutureData<string[]>;
}
