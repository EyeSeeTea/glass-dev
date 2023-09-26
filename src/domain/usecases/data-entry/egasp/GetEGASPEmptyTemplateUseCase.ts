import { UseCase } from "../../../../CompositionRoot";
import { EGASPProgramDefaultRepository } from "../../../../data/repositories/download-empty-template/EGASPProgramDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { DownloadEmptyTemplateRepository } from "../../../repositories/DownloadEmptyTemplateRepository";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";

export class GetEGASPEmptyTemplateUseCase implements UseCase {
    constructor(
        private metadataRepository: MetadataRepository,
        private downloadEmptyTemplateRepository: DownloadEmptyTemplateRepository,
        private excelRepository: ExcelRepository,
        private egaspReposiotry: EGASPProgramDefaultRepository
    ) {}

    public execute(orgUnitId: string): FutureData<any> {
        return this.metadataRepository.getClinicsAndLabsInOrgUnitId(orgUnitId).flatMap(orgUnits => {
            return this.egaspReposiotry.getEGASPTemplateSettings().flatMap(settings => {
                return Future.fromPromise(
                    this.downloadEmptyTemplateRepository.getEmptyTemplate(orgUnits, settings)
                ).flatMap(template => {
                    console.debug(template);
                    return this.excelRepository.loadTemplate(template).flatMap(templateId => {
                        console.debug(templateId);
                        return this.excelRepository.toBlob(templateId).flatMap(data => {
                            console.debug(data);
                            return Future.success(data);
                        });
                    });
                });
            });
        });
    }
}
