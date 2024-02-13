import moment from "moment";
import { UseCase } from "../../CompositionRoot";
import { EGASPProgramDefaultRepository } from "../../data/repositories/download-template/EGASPProgramDefaultRepository";
import { Future, FutureData } from "../entities/Future";
import { DownloadTemplateRepository } from "../repositories/DownloadTemplateRepository";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { MetadataRepository } from "../repositories/MetadataRepository";
import { DownloadTemplate, DownloadType } from "../utils/DownloadTemplate";

export class DownloadPopulatedTemplateUseCase implements UseCase {
    constructor(
        private downloadTemplateRepository: DownloadTemplateRepository,
        private excelRepository: ExcelRepository,
        private egaspRepository: EGASPProgramDefaultRepository,
        private metadataRepository: MetadataRepository
    ) {}

    public execute(
        moduleName: string,
        orgUnit: string,
        period: string,
        fileType: string,
        downloadType: DownloadType
    ): FutureData<File> {
        const startDateOfPeriod = moment(period).startOf("year");
        const endDateOfPeriod = moment(period).endOf("year");
        const useCodesForMetadata = moduleName === "EGASP" ? true : false;
        const downloadRelationships = moduleName === "AMC" && fileType === "PRODUCT" ? true : false;
        const filterTEIEnrollmentDate = downloadRelationships;

        const downloadTemplate = new DownloadTemplate(
            this.downloadTemplateRepository,
            this.excelRepository,
            this.egaspRepository
        );
        return Future.fromPromise(
            downloadTemplate.downloadTemplate({
                moduleName,
                fileType,
                orgUnits: [orgUnit],
                populate: true,
                downloadRelationships,
                useCodesForMetadata,
                downloadType,
                populateStartDate: startDateOfPeriod,
                populateEndDate: endDateOfPeriod,
                startDate: startDateOfPeriod,
                endDate: endDateOfPeriod,
                filterTEIEnrollmentDate,
            })
        );
    }
}
