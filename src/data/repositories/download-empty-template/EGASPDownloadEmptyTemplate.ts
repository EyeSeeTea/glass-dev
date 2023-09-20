import { D2Api } from "@eyeseetea/d2-api/2.34";
import { DownloadEmptyTemplateRepository } from "../../../domain/repositories/DownloadEmptyTemplateRepository";
import { Instance } from "../../entities/Instance";
import { getD2APiFromInstance } from "../../../utils/d2-api";
import * as templates from "../../../domain/entities/data-entry/egasp-templates";
import { SheetBuilder } from "./sheetBuilder";
import { promiseMap } from "../../../utils/promises";
import { GeneratedTemplate } from "../../../domain/entities/Template";
import { CategoryOptionCombo } from "../../dhis2/DataElement";

const DATA_FORM_TYPE = "programs";
const AMR_GLASS_EGASP_PRE_INPUT_FILES_ID = "SOjanrinfuG";

interface ElementMetadata {
    categoryOptionCombos: CategoryOptionCombo[];
}

export class EGASPDownloadEmptyTemplate implements DownloadEmptyTemplateRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    async getEmptyTemplate(orgUnits: string[], settings: Record<string, any>): Promise<File> {
        const egaspTemplate = this.getEGASPTemplate();

        const element = await getElement(this.api, DATA_FORM_TYPE, AMR_GLASS_EGASP_PRE_INPUT_FILES_ID);

        const result = await getElementMetadata({
            api: this.api,
            element,
            orgUnitIds: orgUnits,
        });

        // FIXME: Legacy code, sheet generator
        const sheetBuilder = new SheetBuilder({
            ...result,
            language: "en",
            template: egaspTemplate,
            settings: settings,
            downloadRelationships: true,
            splitDataEntryTabsBySection: false,
            useCodesForMetadata: true,
        });

        const workbook = await sheetBuilder.generate();

        const file = await workbook.writeToBuffer();

        return file;
    }

    private getEGASPTemplate(): GeneratedTemplate {
        return _.values(templates).map(TemplateClass => new TemplateClass())[0] as GeneratedTemplate;
    }
}

async function getElement(api: D2Api, type: string, id: string) {
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

async function getElementMetadata({ element, api, orgUnitIds }: { element: any; api: D2Api; orgUnitIds: string[] }) {
    const elementMetadataMap = new Map();
    const elementMetadata = await api.get<ElementMetadata>(`/programs/${element.id}/metadata.json`).getData();

    const rawMetadata = elementMetadata;

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
            .get<{ organisationUnits: { id: string; displayName: string; code?: string; translations: unknown }[] }>(
                "/metadata",
                {
                    fields: "id,displayName,code,translations",
                    filter: `id:in:[${orgUnits}]`,
                }
            )
            .getData()
    );

    const organisationUnits = _.flatMap(responses, ({ organisationUnits }) =>
        organisationUnits.map(orgUnit => ({
            type: "organisationUnits",
            ...orgUnit,
        }))
    );

    const metadata = {};

    return { element, metadata, elementMetadata: elementMetadataMap, organisationUnits, rawMetadata };
}
