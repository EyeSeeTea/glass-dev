import _ from "lodash";
import { Moment } from "moment";
import { DataFormType } from "../entities/DataForm";
import { Id } from "@eyeseetea/d2-api";
import { RelationshipOrgUnitFilter } from "../../data/repositories/download-template/DownloadTemplateDefaultRepository";
import { GeneratedTemplate } from "../entities/Template";
import { ExcelRepository } from "../repositories/ExcelRepository";
import { DownloadTemplateRepository } from "../repositories/DownloadTemplateRepository";
import { SheetBuilder } from "../../data/repositories/download-template/sheetBuilder";
import { ExcelBuilder } from "../helpers/ExcelBuilder";
import { getTemplateId } from "../../data/repositories/ExcelPopulateDefaultRepository";
import * as templates from "../entities/data-entry/program-templates";
import { EGASPProgramDefaultRepository } from "../../data/repositories/download-template/EGASPProgramDefaultRepository";
import { EGASP_PROGRAM_ID } from "../../data/repositories/program-rule/ProgramRulesMetadataDefaultRepository";
import {
    AMC_PRODUCT_REGISTER_PROGRAM_ID,
    AMC_RAW_PRODUCT_CONSUMPTION_CALCULATED_STAGE_ID,
    AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
} from "../usecases/data-entry/amc/ImportAMCProductLevelData";
import {
    AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID,
    AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID,
} from "../usecases/data-entry/amc/ImportAMCSubstanceLevelData";

export type DownloadType = "SUBMITTED" | "CALCULATED";
export interface DownloadTemplateProps {
    moduleName: string;
    fileType: string;
    orgUnits: string[];
    populate: boolean;
    downloadRelationships: boolean;
    useCodesForMetadata: boolean;
    startDate?: Moment;
    endDate?: Moment;
    downloadType?: DownloadType;
    populateStartDate?: Moment;
    populateEndDate?: Moment;
    filterTEIEnrollmentDate?: boolean;
    relationshipsOuFilter?: RelationshipOrgUnitFilter;
}

export class DownloadTemplate {
    constructor(
        private downloadtemplateRepository: DownloadTemplateRepository,
        private excelRepository: ExcelRepository,
        private egaspRepository: EGASPProgramDefaultRepository
    ) {}

    public async downloadTemplate({
        moduleName,
        fileType,
        downloadType,
        orgUnits,
        startDate,
        endDate,
        populate,
        populateStartDate,
        populateEndDate,
        downloadRelationships,
        filterTEIEnrollmentDate,
        relationshipsOuFilter,
        useCodesForMetadata = false,
    }: DownloadTemplateProps): Promise<File> {
        const { programId, programStageId } = getProgramId(moduleName, fileType, downloadType);
        const formType = getFormType(programId);
        const settings = await this.egaspRepository.getTemplateSettings().toPromise();
        const template = this.getTemplate(programId);
        if (!template) {
            throw new Error("No template found for this Program");
        }

        const element = await this.downloadtemplateRepository.getElement(formType, programId);

        const result = await this.downloadtemplateRepository.getElementMetadata({
            element,
            orgUnitIds: orgUnits,
            downloadRelationships: downloadRelationships,
            startDate: startDate?.toDate(),
            endDate: endDate?.toDate(),
            populateStartDate: populateStartDate?.toDate(),
            populateEndDate: populateEndDate?.toDate(),
        });

        // FIXME: Legacy code, sheet generator
        const sheetBuilder = new SheetBuilder({
            ...result,
            language: "en",
            template: template,
            settings: settings,
            downloadRelationships: downloadRelationships,
            splitDataEntryTabsBySection: true,
            useCodesForMetadata: useCodesForMetadata,
        });

        const workbook = await sheetBuilder.generate(programId, programStageId);

        const file = await workbook.writeToBuffer();

        const enablePopulate = populate && !!populateStartDate && !!populateEndDate;

        await this.excelRepository.loadTemplate(file, programId).toPromise();

        const dataPackage = enablePopulate
            ? await this.downloadtemplateRepository.getDataPackage({
                  type: formType,
                  id: programId,
                  orgUnits,
                  startDate: populateStartDate,
                  endDate: populateEndDate,
                  filterTEIEnrollmentDate,
                  relationshipsOuFilter,
              })
            : undefined;

        const builder = new ExcelBuilder(this.excelRepository, this.downloadtemplateRepository);

        if (enablePopulate && dataPackage) {
            await builder.populateTemplate(template, dataPackage, settings);
        }

        const data = await this.excelRepository.toBlob(template.id);

        return new File([data], "Excel");
    }

    private getTemplate(programId: Id): GeneratedTemplate {
        const id = getTemplateId(programId);

        return _.values(templates)
            .map(TemplateClass => new TemplateClass())
            .filter(t => t.id === id)[0] as GeneratedTemplate;
    }
}

const getProgramId = (
    moduleName: string,
    fileType: string,
    downloadType?: DownloadType
): { programId: Id; programStageId?: Id } => {
    if (moduleName === "EGASP") {
        return { programId: EGASP_PROGRAM_ID };
    } else if (moduleName === "AMC") {
        if (fileType === "SUBSTANCE") {
            if (downloadType === "CALCULATED") {
                return { programId: AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID };
            } else return { programId: AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID };
        } else if (fileType === "PRODUCT") {
            if (downloadType === "CALCULATED") {
                return {
                    programId: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                    programStageId: AMC_RAW_PRODUCT_CONSUMPTION_CALCULATED_STAGE_ID,
                };
            } else if (downloadType === "SUBMITTED") {
                return {
                    programId: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                    programStageId: AMC_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
                };
            } else {
                return {
                    programId: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                };
            }
        } else throw new Error(`Unknown file type: ${fileType}`);
    } else {
        throw new Error("Unknown module type");
    }
};

const getFormType = (programId: Id): DataFormType => {
    switch (programId) {
        case AMC_PRODUCT_REGISTER_PROGRAM_ID:
            return "trackerPrograms";
        case EGASP_PROGRAM_ID:
        case AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID:
        case AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID:
            return "programs";
        default:
            return "programs";
    }
};
