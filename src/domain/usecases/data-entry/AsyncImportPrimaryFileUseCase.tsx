import { Maybe } from "../../../utils/ts-utils";
import { Country } from "../../entities/Country";
import { CustomDataColumns } from "../../entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { ImportSummary } from "../../entities/data-entry/ImportSummary";
import { Future, FutureData } from "../../entities/Future";
import { DEFAULT_ASYNC_UPLOAD_DELETE_CHUNK_SIZE, GlassModule } from "../../entities/GlassModule";
import { Id } from "../../entities/Ref";
import { RISIndividualFungalDataRepository } from "../../repositories/data-entry/RISIndividualFungalDataRepository";
import { GlassDocumentsRepository } from "../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../repositories/GlassUploadsRepository";
import { MetadataRepository } from "../../repositories/MetadataRepository";
import { ProgramRulesMetadataRepository } from "../../repositories/program-rules/ProgramRulesMetadataRepository";
import { TrackerRepository } from "../../repositories/TrackerRepository";
import { AsyncImportRISIndividualFungalFile } from "./amr-individual-fungal/AsyncImportRISIndividualFungalFile";

export class AsyncImportPrimaryFileUseCase {
    constructor(
        private repositories: {
            risIndividualFungalRepository: RISIndividualFungalDataRepository;
            trackerRepository: TrackerRepository;
            programRulesMetadataRepository: ProgramRulesMetadataRepository;
            glassDocumentsRepository: GlassDocumentsRepository;
            glassUploadsRepository: GlassUploadsRepository;
            metadataRepository: MetadataRepository;
        }
    ) {}

    public execute(params: {
        primaryUploadId: Id;
        inputBlob: Blob;
        glassModule: GlassModule;
        orgUnitId: Id;
        countryCode: string;
        period: string;
        program: Maybe<{
            id: Id;
            programStageId: string;
        }>;
        dataColumns: CustomDataColumns;
        allCountries: Country[];
    }): FutureData<ImportSummary[]> {
        const {
            primaryUploadId,
            inputBlob,
            glassModule,
            orgUnitId,
            countryCode,
            period,
            program,
            dataColumns,
            allCountries,
        } = params;
        switch (glassModule.name) {
            case "AMR - Individual":
            case "AMR - Fungal": {
                const uploadChunkSize =
                    glassModule.asyncUploadChunkSizes?.primaryUpload || DEFAULT_ASYNC_UPLOAD_DELETE_CHUNK_SIZE;

                const asyncImportRISIndividualFungalFile = new AsyncImportRISIndividualFungalFile(this.repositories);
                return asyncImportRISIndividualFungalFile.asyncImportRISIndividualFungalFile({
                    uploadId: primaryUploadId,
                    inputBlob: inputBlob,
                    glassModule: glassModule,
                    uploadChunkSize: uploadChunkSize,
                    orgUnitId: orgUnitId,
                    countryCode: countryCode,
                    period: period,
                    program: program,
                    dataColumns: dataColumns,
                    allCountries: allCountries,
                });
            }

            default: {
                return Future.error(`Module ${glassModule.name} not implemented`);
            }
        }
    }
}
