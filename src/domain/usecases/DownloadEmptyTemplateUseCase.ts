import { UseCase } from "../../CompositionRoot";
import { EGASPProgramDefaultRepository } from "../../data/repositories/download-template/EGASPProgramDefaultRepository";
import { Future, FutureData } from "../entities/Future";
import { DownloadTemplateRepository } from "../repositories/DownloadTemplateRepository";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { MetadataRepository } from "../repositories/MetadataRepository";
import { DownloadTemplate } from "../utils/DownloadTemplate";

export class DownloadEmptyTemplateUseCase implements UseCase {
    constructor(
        private downloadTemplateRepository: DownloadTemplateRepository,
        private excelRepository: ExcelRepository,
        private egaspRepository: EGASPProgramDefaultRepository,
        private metadataRepository: MetadataRepository
    ) {}

    public execute(moduleName: string, fileType: string, orgUnit: string): FutureData<File> {
        const downloadTemplate = new DownloadTemplate(
            this.downloadTemplateRepository,
            this.excelRepository,
            this.egaspRepository
        );

        const downloadRelationships = moduleName === "AMC" && fileType === "PRODUCT" ? true : false;
        return this.metadataRepository.getClinicsAndLabsInOrgUnitId(orgUnit).flatMap(clinicsAndLabsOrgUnits => {
            const orgUnits = moduleName === "EGASP" ? clinicsAndLabsOrgUnits : [orgUnit];
            return Future.fromPromise(
                downloadTemplate.downloadTemplate({
                    moduleName,
                    fileType,
                    orgUnits,
                    populate: false, //Do not download data for empty template
                    downloadRelationships,
                    useCodesForMetadata: moduleName === "EGASP" || moduleName === "AMC",
                })
            );
        });
    }
}
