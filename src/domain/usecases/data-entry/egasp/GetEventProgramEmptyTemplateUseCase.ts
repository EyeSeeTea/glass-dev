import { UseCase } from "../../../../CompositionRoot";
import { EGASPProgramDefaultRepository } from "../../../../data/repositories/download-empty-template/EGASPProgramDefaultRepository";
import { EGASP_PROGRAM_ID } from "../../../../data/repositories/program-rule/ProgramRulesMetadataDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { Id } from "../../../entities/Ref";
import { DownloadEmptyTemplateRepository } from "../../../repositories/DownloadEmptyTemplateRepository";
import { ExcelRepository } from "../../../repositories/ExcelRepository";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { AMC_PRODUCT_REGISTER_PROGRAM_ID } from "../amc/ImportAMCProductLevelData";
import { AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID } from "../amc/ImportAMCSubstanceLevelData";

export class GetEventProgramEmptyTemplateUseCase implements UseCase {
    constructor(
        private metadataRepository: MetadataRepository,
        private downloadEmptyTemplateRepository: DownloadEmptyTemplateRepository,
        private excelRepository: ExcelRepository,
        private egaspReposiotry: EGASPProgramDefaultRepository
    ) {}

    private getEventProgramTemplate(
        programId: Id,
        orgUnits: string[],
        downloadRelationships: boolean,
        useCodesForMetadata: boolean,
        formType: string
    ) {
        return this.egaspReposiotry.getTemplateSettings().flatMap(settings => {
            return Future.fromPromise(
                this.downloadEmptyTemplateRepository.getEmptyTemplate(
                    programId,
                    orgUnits,
                    settings,
                    downloadRelationships,
                    useCodesForMetadata,
                    formType
                )
            ).flatMap(template => {
                return this.excelRepository.loadTemplate(template, programId).flatMap(templateId => {
                    return this.excelRepository.toBlob(templateId).flatMap(data => {
                        return Future.success(data);
                    });
                });
            });
        });
    }
    public execute(moduleName: string, fileType: string, orgUnitId: string): FutureData<any> {
        if (moduleName === "EGASP")
            return this.metadataRepository.getClinicsAndLabsInOrgUnitId(orgUnitId).flatMap(orgUnits => {
                return this.getEventProgramTemplate(EGASP_PROGRAM_ID, orgUnits, false, true, "programs");
            });
        else if (moduleName === "AMC") {
            if (fileType === "SUBSTANCE")
                return this.getEventProgramTemplate(
                    AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID,
                    [orgUnitId],
                    false,
                    false,
                    "programs"
                );
            else
                return this.getEventProgramTemplate(
                    AMC_PRODUCT_REGISTER_PROGRAM_ID,
                    [orgUnitId],
                    true,
                    false,
                    "trackerPrograms"
                );
        } else return Future.error("Unknown module type");
    }
}
