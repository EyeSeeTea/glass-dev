import { UseCase } from "../../../../CompositionRoot";
import { Future, FutureData } from "../../../entities/Future";
import { DownloadEmptyTemplateRepository } from "../../../repositories/DownloadEmptyTemplateRepository";
import { ExcelRepository } from "../../../repositories/ExcelRepository";

export class GetEGASPEmptyTemplateUseCase implements UseCase {
    constructor(
        private downloadEmptyTemplateRepository: DownloadEmptyTemplateRepository,
        private excelRepository: ExcelRepository
    ) {}

    public execute(): FutureData<any> {
        return Future.fromPromise(this.downloadEmptyTemplateRepository.getEmptyTemplate()).flatMap(template => {
            return this.excelRepository.loadTemplate(template).flatMap(templateId => {
                return this.excelRepository.toBlob(templateId).flatMap(data => {
                    return Future.success(data);
                });
            });
        });
    }
}
