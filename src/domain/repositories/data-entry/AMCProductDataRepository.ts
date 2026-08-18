import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { FutureData } from "../../entities/Future";
import { Id } from "../../entities/Ref";
import { ProductDataTrackedEntity } from "../../entities/data-entry/amc/ProductDataTrackedEntity";
import { ProductRegisterProgramMetadata, ProgramStage } from "../../entities/data-entry/amc/ProductRegisterProgram";
import { RawSubstanceConsumptionCalculated } from "../../entities/data-entry/amc/RawSubstanceConsumptionCalculated";
import { ImportStrategy } from "../../entities/data-entry/DataValuesSaveSummary";
import { ConsistencyError } from "../../entities/data-entry/ImportSummary";

export interface AMCProductDataRepository {
    validate(
        file: File,
        teiDataColumns: string[],
        rawProductDataColumns: string[]
    ): FutureData<{ isValid: boolean; rows: number; specimens: string[] }>;
    // Validates the TEIid linking key between the "TEI Instances" and "Raw Product Consumption" tabs
    // (blank/duplicate TEIid, and consumption rows referencing a TEIId absent from TEI Instances).
    // Must run on the raw file BEFORE template parsing, since the parser silently repairs/drops these
    // problems (a blank product TEIid gets an auto-generated UID; an unmatched/blank consumption row
    // is dropped) rather than surfacing them as errors.
    checkTeiIdIntegrity(file: File): FutureData<ConsistencyError[]>;
    checkTeiIdIntegrityFromArrayBuffer(fileArrayBuffer: ArrayBuffer): FutureData<ConsistencyError[]>;
    importCalculations(params: {
        importStrategy: ImportStrategy;
        productDataTrackedEntities: ProductDataTrackedEntity[];
        rawSubstanceConsumptionCalculatedStageMetadata: ProgramStage;
        rawSubstanceConsumptionCalculatedData: RawSubstanceConsumptionCalculated[];
        orgUnitId: Id;
        period: string;
        chunkSize?: number;
    }): FutureData<TrackerPostResponse>;
    getProductRegisterProgramMetadata(): FutureData<ProductRegisterProgramMetadata | undefined>;
    getProductRegisterAndRawProductConsumptionByProductIds(
        orgUnitId: Id,
        productIds: Id[],
        period: string,
        productIdsChunkSize: number,
        chunked?: boolean
    ): FutureData<ProductDataTrackedEntity[]>;
    getAllProductRegisterAndRawProductConsumptionByPeriod(
        orgUnitId: Id,
        period: string
    ): FutureData<ProductDataTrackedEntity[]>;
    getTrackedEntityProductIdsByOUAndPeriod(orgUnitId: Id, period: string): FutureData<string[]>;
    deleteRawSubstanceConsumptionCalculatedById(
        rawSubstanceConsumptionCalculatedIds: Id[],
        chunkSize?: number
    ): FutureData<TrackerPostResponse>;
}
