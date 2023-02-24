import {
    D2Api,
    DataValueSetsPostParams,
    DataValueSetsPostRequest,
    DataValueSetsPostResponse,
} from "@eyeseetea/d2-api/2.34";
import { FutureData } from "../../domain/entities/Future";
import { GlassImportRISFileRepository } from "../../domain/repositories/GlassImportRISFileRepository";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Instance } from "../entities/Instance";

export class GlassImportRISFileDefaultRepository implements GlassImportRISFileRepository {
    private api: D2Api;

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    importRISFile(
        params: DataValueSetsPostParams,
        request: DataValueSetsPostRequest
    ): FutureData<DataValueSetsPostResponse> {
        return apiToFuture(this.api.dataValues.postSet(params, request));
    }

    async getOrgUnit(orgUnit: string): Promise<string | undefined> {
        const orgUnitId = await this.api.models.organisationUnits
            .get({
                paging: false,
                fields: {
                    id: true,
                },
                filter: {
                    code: { eq: orgUnit },
                },
            })
            .getData();

        return orgUnitId.objects.at(0)?.id;
    }

    async getDataElementsAndAttributeCombo(
        datasetId: string
    ): Promise<{ dataElements: { id: string; code: string }[]; attributeOptionComboList: string[] }> {
        const dataSet = await this.api.models.dataSets
            .get({
                paging: false,
                fields: {
                    id: true,
                    shortName: true,
                    dataSetElements: {
                        dataElement: {
                            id: true,
                            shortName: true,
                            code: true,
                        },
                    },
                    categoryCombo: {
                        id: true,
                        categories: {
                            id: true,
                            code: true,
                            shortName: true,
                        },
                    },
                },
                filter: {
                    id: { eq: datasetId },
                },
            })
            .getData();

        //On filtering by id, only one dataset should be returned
        if (dataSet.objects.length === 1) {
            const dataElements = dataSet.objects.at(0)?.dataSetElements.map(de => {
                return {
                    id: de.dataElement.id,
                    code: de.dataElement.code,
                };
            });

            const attributeOptionComboCodeList = dataSet.objects.at(0)?.categoryCombo.categories.map(c => c.code);
            if (dataElements && attributeOptionComboCodeList)
                return { dataElements, attributeOptionComboList: attributeOptionComboCodeList };
        }
        return { dataElements: [], attributeOptionComboList: [] };
    }

    async getCategoryOptionCombo(codeList: string[]): Promise<string | undefined> {
        const categoryOptionsRes = this.api.models.categoryOptions
            .get({
                paging: false,
                fields: {
                    displayName: true,
                    code: true,
                    id: true,
                    categoryOptionCombos: {
                        id: true,
                    },
                },
                filter: {
                    code: { in: codeList },
                },
            })
            .getData();

        //The categoryOptionComboId will be common between both category options.
        const categoryOptions = await categoryOptionsRes;

        let commonCategoryOptionCombos = categoryOptions.objects.at(0)?.categoryOptionCombos;
        categoryOptions.objects.map(co => {
            return (commonCategoryOptionCombos = co.categoryOptionCombos.filter(co =>
                commonCategoryOptionCombos?.some(c => c.id === co.id)
            ));
        });

        if (commonCategoryOptionCombos?.length === 1) {
            return commonCategoryOptionCombos.at(0)?.id;
        } else return "";
    }
}
