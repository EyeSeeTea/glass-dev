import { D2Api, MetadataPick } from "@eyeseetea/d2-api/2.34";
import { CategoryCombo } from "../../domain/entities/metadata/CategoryCombo";
import { Future, FutureData } from "../../domain/entities/Future";
import { getD2APiFromInstance } from "../../utils/d2-api";
import { apiToFuture } from "../../utils/futures";
import { Instance } from "../entities/Instance";
import { DataSet } from "../../domain/entities/metadata/DataSet";
import { CodedRef, NamedRef } from "../../domain/entities/Ref";
import { MetadataRepository } from "../../domain/repositories/MetadataRepository";
import { Id } from "../../domain/entities/Base";

const AMR_EGASP_Clinics = "lohCVAxPxMM";
const AMR_EGASP_Labs = "KhLlLrKWPKu";

export class MetadataDefaultRepository implements MetadataRepository {
    private api: D2Api;

    //TODO: @cache does not work with futures
    // I've created here an manual in memory cache to avoid many requests
    private inmemoryCache: Record<string, unknown> = {};

    constructor(instance: Instance) {
        this.api = getD2APiFromInstance(instance);
    }

    getDataElementNames(dataElementIds: string[]): FutureData<NamedRef[]> {
        return apiToFuture(
            this.api.metadata
                .get({
                    dataElements: {
                        fields: { shortName: true, code: true, id: true },
                        filter: { id: { in: dataElementIds } },
                    },
                })
                .map(response => {
                    if (response?.data?.dataElements) {
                        return response?.data?.dataElements.map(de => {
                            return {
                                id: de.id,
                                name: `${de.shortName}(${de.code})`,
                            };
                        });
                    } else {
                        return [];
                    }
                })
        );
    }

    getOrgUnitsByCode(orgUnitCodes: string[]): FutureData<CodedRef[]> {
        return apiToFuture(
            this.api.models.organisationUnits.get({
                paging: false,
                fields: {
                    id: true,
                    code: true,
                },
                filter: {
                    code: { in: orgUnitCodes },
                },
            })
        ).map(response => response.objects);
    }

    getClinicsAndLabsInOrgUnitId(id: string): FutureData<Id[]> {
        const cacheKey = `clinics-labs-in-${id}`;
        return this.getFromCacheOrRemote(
            cacheKey,
            apiToFuture(
                this.api.models.organisationUnits.get({
                    paging: false,
                    fields: {
                        id: true,
                        organisationUnitGroups: {
                            id: true,
                        },
                    },
                    filter: {
                        path: { like: id },
                    },
                })
            ).map(response => {
                //Filter by org unit group name
                const orgUnitsFilteredGroup = response.objects.filter(
                    ou =>
                        ou.organisationUnitGroups.length > 0 &&
                        (ou.organisationUnitGroups.some(o => o.id === AMR_EGASP_Clinics) ||
                            ou.organisationUnitGroups.some(o => o.id === AMR_EGASP_Labs))
                );
                return orgUnitsFilteredGroup.map(({ id }) => id);
            })
        );
    }

    getClinicOrLabNames(clinicLabIds: string[]): FutureData<{ id: string; name: string }[]> {
        return apiToFuture(
            this.api.models.organisationUnits.get({
                paging: false,
                fields: {
                    id: true,
                    name: true,
                },
                filter: {
                    id: { in: clinicLabIds },
                },
            })
        ).map(response => response.objects);
    }

    getDataSet(id: string): FutureData<DataSet> {
        return apiToFuture(
            this.api.models.dataSets.get({
                paging: false,
                fields: dataSetFields,
                filter: {
                    id: { eq: id },
                },
            })
        ).flatMap(response => {
            const dataSet = response.objects[0];

            if (dataSet) {
                return Future.success(this.buildDataSet(dataSet));
            } else {
                return Future.error(`DataSet with id ${id} not found`);
            }
        });
    }

    getCategoryCombination(id: string): FutureData<CategoryCombo> {
        return apiToFuture(
            this.api.models.categoryCombos.get({
                fields: categoryComboFields,
                filter: {
                    id: { eq: id },
                },
            })
        ).flatMap(response => {
            const categoryCombination = response.objects[0];

            if (categoryCombination) {
                return Future.success(this.buildCategoryCombo(categoryCombination));
            } else {
                return Future.error(`Category Combination with id ${id} not found`);
            }
        });
    }

    buildDataSet(dataset: D2DataSet): DataSet {
        return {
            id: dataset.id,
            name: dataset.name,
            dataElements: dataset.dataSetElements.map(({ dataElement }) => {
                return {
                    id: dataElement.id,
                    name: dataElement.name,
                    code: dataElement.code,
                    categoryCombo: dataElement.categoryCombo,
                };
            }),
            categoryCombo: dataset.categoryCombo.id,
        };
    }

    validateDataSet(dataset: string, period: string, orgUnit: string, AOCs: string[]): FutureData<unknown> {
        return Future.parallel(
            AOCs.map(aoc => {
                return apiToFuture(
                    this.api
                        .get(`/validation/dataSet/${dataset}?pe=${period}&ou=${orgUnit}&aoc=${aoc}`)
                        .map(response => response.data)
                );
            })
        );
    }

    getValidationRuleInstructions(ids: string[]): FutureData<{ id: string; instruction: string }[]> {
        return apiToFuture(
            this.api.models.validationRules.get({
                fields: {
                    id: true,
                    instruction: true,
                },
                filter: {
                    id: { in: ids },
                },
            })
        ).map(res => res.objects);
    }

    private buildCategoryCombo(categoryCombo: D2CategoryCombo): CategoryCombo {
        return {
            id: categoryCombo.id,
            name: categoryCombo.name,
            categories: categoryCombo.categories.map(cat => {
                return {
                    id: cat.id,
                    code: cat.code,
                };
            }),
            categoryOptionCombos: categoryCombo.categoryOptionCombos.map(catOpComb => {
                return {
                    id: catOpComb.id,
                    name: catOpComb.name,
                    categoryOptions: catOpComb.categoryOptions.map(catOp => {
                        return {
                            id: catOp.id,
                            code: catOp.code,
                        };
                    }),
                };
            }),
        };
    }

    private getFromCacheOrRemote<T>(cacheKey: string, future: FutureData<T>): FutureData<T> {
        if (this.inmemoryCache[cacheKey]) {
            const responseInCache = this.inmemoryCache[cacheKey] as T;
            return Future.success(responseInCache);
        } else {
            return future.map(response => {
                this.inmemoryCache[cacheKey] = response;
                return response;
            });
        }
    }
}

const dataSetFields = {
    id: true,
    name: true,
    dataSetElements: {
        dataElement: {
            id: true,
            name: true,
            code: true,
            categoryCombo: true,
        },
    },
    categoryCombo: {
        id: true,
    },
};

type D2DataSet = MetadataPick<{
    dataSets: { fields: typeof dataSetFields };
}>["dataSets"][number];

const categoryComboFields = {
    id: true,
    name: true,
    categories: { id: true, code: true },
    categoryOptionCombos: {
        id: true,
        name: true,
        categoryOptions: { id: true, code: true },
    },
} as const;

type D2CategoryCombo = MetadataPick<{
    categoryCombos: { fields: typeof categoryComboFields };
}>["categoryCombos"][number];

export type D2ValidationResponse = {
    commentRequiredViolations: unknown[];
    validationRuleViolations: unknown[];
};
