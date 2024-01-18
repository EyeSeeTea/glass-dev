import _ from "lodash";
import { Moment } from "moment";
import { DataFormType } from "../../entities/DataForm";
import { Id } from "@eyeseetea/d2-api";
import { RelationshipOrgUnitFilter } from "../../../data/repositories/download-template/DownloadTemplateDefaultRepository";
import { GeneratedTemplate, TemplateType } from "../../entities/Template";
import { UseCase } from "../../../CompositionRoot";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { ExcelRepository } from "../../repositories/ExcelRepository";
import { DownloadTemplateRepository } from "../../repositories/DownloadTemplateRepository";
import { SheetBuilder } from "../../../data/repositories/download-template/sheetBuilder";
import { ExcelBuilder } from "../../helpers/ExcelBuilder";
import { Ref } from "../../entities/Ref";
import { promiseMap } from "../../../utils/promises";
import { getTemplateId } from "../../../data/repositories/ExcelPopulateDefaultRepository";
import * as templates from "../../entities/data-entry/program-templates";
import { getRelationshipMetadata } from "../../../data/repositories/download-template/Dhis2RelationshipTypes";
import { EGASPProgramDefaultRepository } from "../../../data/repositories/download-template/EGASPProgramDefaultRepository";
import { EGASP_PROGRAM_ID } from "../../../data/repositories/program-rule/ProgramRulesMetadataDefaultRepository";
import {
    AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID,
    AMC_SUBSTANCE_CALCULATED_CONSUMPTION_PROGRAM_ID,
} from "./amc/ImportAMCSubstanceLevelData";
import {
    AMC_PRODUCT_REGISTER_PROGRAM_ID,
    AMR_RAW_PRODUCT_CONSUMPTION_CALCULATED_STAGE_ID,
    AMR_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
} from "./amc/ImportAMCProductLevelData";

export type FileType = "PRODUCT" | "SUBSTANCE";
export type DownloadType = "SUBMITTED" | "CALCULATED";

export interface DownloadTemplateProps {
    formType?: DataFormType;
    moduleName: string;
    fileType: "PRODUCT" | "SUBSTANCE";
    downloadType?: "SUBMITTED" | "CALCULATED";
    orgUnits?: string[];
    startDate?: Moment;
    endDate?: Moment;
    populate?: boolean;
    populateStartDate?: Moment;
    populateEndDate?: Moment;
    downloadRelationships: boolean;
    filterTEIEnrollmentDate?: boolean;
    relationshipsOuFilter?: RelationshipOrgUnitFilter;
    templateId?: string;
    templateType?: TemplateType;
    splitDataEntryTabsBySection?: boolean;
    useCodesForMetadata: boolean;
}

export class DownloadTemplateUseCase implements UseCase {
    constructor(
        private DownloadtemplateRepository: DownloadTemplateRepository,
        private excelRepository: ExcelRepository,
        private egaspRepository: EGASPProgramDefaultRepository
    ) {}

    public async execute(
        api: D2Api,
        {
            formType = "trackerPrograms",
            moduleName,
            fileType,
            downloadType,
            orgUnits = [],
            startDate,
            endDate,
            populate,
            populateStartDate,
            populateEndDate,
            downloadRelationships = true,
            filterTEIEnrollmentDate,
            relationshipsOuFilter,
            splitDataEntryTabsBySection = false,
            useCodesForMetadata = true,
        }: DownloadTemplateProps
    ): Promise<File> {
        const { programId, programStageId } = getProgramId(moduleName, fileType, downloadType);
        const settings = await this.egaspRepository.getTemplateSettings().toPromise();
        const template = this.getTemplate(programId);

        const element = await this.getElement(api, formType, programId);

        const result = await getElementMetadata({
            api: api,
            element,
            orgUnitIds: orgUnits,
            downloadRelationships,
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
            downloadRelationships: true,
            splitDataEntryTabsBySection: splitDataEntryTabsBySection,
            useCodesForMetadata: useCodesForMetadata,
        });

        const workbook = await sheetBuilder.generate(programId, programStageId);

        const file = await workbook.writeToBuffer();

        const enablePopulate = populate && !!populateStartDate && !!populateEndDate;

        await this.excelRepository.loadTemplate(file, programId).toPromise();

        const dataPackage = enablePopulate
            ? await this.DownloadtemplateRepository.getDataPackage({
                  type: formType,
                  id: programId,
                  orgUnits,
                  startDate: populateStartDate,
                  endDate: populateEndDate,
                  filterTEIEnrollmentDate,
                  relationshipsOuFilter,
              })
            : undefined;

        const builder = new ExcelBuilder(this.excelRepository, this.DownloadtemplateRepository);

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

    async getElement(api: D2Api, type: string, id: string) {
        const fields = [
            "id",
            "displayName",
            "organisationUnits[id,path]",
            "attributeValues[attribute[code],value]",
            "categoryCombo",
            "dataSetElements",
            "formType",
            "sections[id,sortOrder,dataElements[id]]",
            "periodType",
            "programStages[id,access]",
            "programType",
            "enrollmentDateLabel",
            "incidentDateLabel",
            "trackedEntityType[id,featureType]",
            "captureCoordinates",
            "programTrackedEntityAttributes[trackedEntityAttribute[id,name,valueType,confidential,optionSet[id,name,options[id]]]],",
        ].join(",");
        const response = await api.get<any>(`/programs/${id}`, { fields }).getData();
        return { ...response, type };
    }
}

async function getElementMetadata({
    api,
    element,
    orgUnitIds,
    downloadRelationships,
    populateStartDate,
    populateEndDate,
    startDate,
    endDate,
}: {
    api: D2Api;
    element: any;
    orgUnitIds: string[];
    downloadRelationships: boolean;
    startDate?: Date;
    endDate?: Date;
    populateStartDate?: Date;
    populateEndDate?: Date;
}) {
    const elementMetadataMap = new Map();
    const elementMetadata = await api.get<ElementMetadata>(`/programs/${element.id}/metadata.json`).getData();

    const rawMetadata = await filterRawMetadata({ api, element, elementMetadata, orgUnitIds, startDate, endDate });

    _.forOwn(rawMetadata, (value, type) => {
        if (Array.isArray(value)) {
            _.forEach(value, (object: any) => {
                if (object.id) elementMetadataMap.set(object.id, { ...object, type });
            });
        }
    });

    // FIXME: This is needed for getting all possible org units for a program/dataSet
    const requestOrgUnits = orgUnitIds;

    const responses = await promiseMap(_.chunk(_.uniq(requestOrgUnits), 400), orgUnits =>
        api
            .get<{
                organisationUnits: { id: string; displayName: string; code?: string; translations: unknown }[];
            }>("/metadata", {
                fields: "id,displayName,code,translations",
                filter: `id:in:[${orgUnits}]`,
            })
            .getData()
    );

    const organisationUnits = _.flatMap(responses, ({ organisationUnits }) =>
        organisationUnits.map(orgUnit => ({
            type: "organisationUnits",
            ...orgUnit,
        }))
    );

    const metadata =
        element.type === "trackerPrograms" && downloadRelationships
            ? await getRelationshipMetadata(element, api, {
                  startDate: populateStartDate,
                  endDate: populateEndDate,
              })
            : {};

    return { element, metadata, elementMetadata: elementMetadataMap, organisationUnits, rawMetadata };
}

interface ElementMetadata {
    categoryOptionCombos: CategoryOptionCombo[];
}

interface CategoryOptionCombo {
    categoryOptions: Ref[];
}

interface Element {
    type: "dataSets" | "programs";
    organisationUnits: Ref[];
}

/* Return the raw metadata filtering out non-relevant category option combos.

    /api/dataSets/ID/metadata returns categoryOptionCombos that may not be relevant for the
    data set. Here we filter out category option combos with categoryOptions not matching these
    conditions:

     - categoryOption.startDate/endDate outside the startDate -> endDate interval
     - categoryOption.orgUnit EMPTY or assigned to the dataSet orgUnits (intersected with the requested).
*/

async function filterRawMetadata(options: {
    api: D2Api;
    element: Element;
    elementMetadata: ElementMetadata;
    orgUnitIds: Id[];
    startDate: Date | undefined;
    endDate: Date | undefined;
}): Promise<ElementMetadata & unknown> {
    const { api, element, elementMetadata, orgUnitIds } = options;

    if (element.type === "dataSets") {
        const categoryOptions = await getCategoryOptions(api);
        const categoryOptionIdsToInclude = getCategoryOptionIdsToInclude(element, orgUnitIds, categoryOptions, options);

        const categoryOptionCombosFiltered = elementMetadata.categoryOptionCombos.filter(coc =>
            _(coc.categoryOptions).every(categoryOption => {
                return categoryOptionIdsToInclude.has(categoryOption.id);
            })
        );

        return { ...elementMetadata, categoryOptionCombos: categoryOptionCombosFiltered };
    } else {
        return elementMetadata;
    }
}

interface CategoryOption {
    id: Id;
    startDate?: string;
    endDate?: String;
    organisationUnits: Ref[];
}

function getCategoryOptionIdsToInclude(
    element: Element,
    orgUnitIds: string[],
    categoryOptions: CategoryOption[],
    options: { startDate: Date | undefined; endDate: Date | undefined }
) {
    const dataSetOrgUnitIds = element.organisationUnits.map(ou => ou.id);

    const orgUnitIdsToInclude = new Set(
        _.isEmpty(orgUnitIds) ? dataSetOrgUnitIds : _.intersection(orgUnitIds, dataSetOrgUnitIds)
    );

    const startDate = options.startDate?.toISOString();
    const endDate = options.endDate?.toISOString();

    const categoryOptionIdsToInclude = new Set(
        categoryOptions
            .filter(categoryOption => {
                const noStartDateIntersect = startDate && categoryOption.endDate && startDate > categoryOption.endDate;
                const noEndDateIntersect = endDate && categoryOption.startDate && endDate < categoryOption.startDate;
                const dateCondition = !noStartDateIntersect && !noEndDateIntersect;

                const categoryOptionOrgUnitCondition =
                    _.isEmpty(categoryOption.organisationUnits) ||
                    _(categoryOption.organisationUnits).some(orgUnit => orgUnitIdsToInclude.has(orgUnit.id));

                return dateCondition && categoryOptionOrgUnitCondition;
            })
            .map(categoryOption => categoryOption.id)
    );
    return categoryOptionIdsToInclude;
}

async function getCategoryOptions(api: D2Api): Promise<CategoryOption[]> {
    const { categoryOptions } = await api.metadata
        .get({
            categoryOptions: {
                fields: {
                    id: true,
                    startDate: true,
                    endDate: true,
                    organisationUnits: { id: true },
                },
            },
        })
        .getData();

    return categoryOptions;
}

const getProgramId = (
    moduleName: string,
    fileType: FileType,
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
                    programStageId: AMR_RAW_PRODUCT_CONSUMPTION_CALCULATED_STAGE_ID,
                };
            } else if (downloadType === "SUBMITTED") {
                return {
                    programId: AMC_PRODUCT_REGISTER_PROGRAM_ID,
                    programStageId: AMR_RAW_PRODUCT_CONSUMPTION_STAGE_ID,
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
