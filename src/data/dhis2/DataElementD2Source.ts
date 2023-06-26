import "lodash.product";
import _ from "lodash";
import { getId, Id } from "../../domain/entities/Base";
import { CategoryOptionCombo, DataElement } from "./DataElement";
import { D2Api, MetadataPick } from "../../types/d2-api";
import { Maybe } from "../../types/utils";
import { FutureData } from "../../domain/entities/Future";
import { apiToFuture } from "../../utils/futures";
import { D2DataElement, D2DataSet } from "./DataFormD2Source";

export class DataElementD2Source {
    constructor(private api: D2Api) {}

    get(dataForm: D2DataSet): FutureData<Record<Id, DataElement>> {
        const categoryComboIds = _(dataForm.sections)
            .flatMap(section => section.dataElements)
            .map(dataElement => dataElement.categoryCombo.id)
            .concat(dataForm.dataSetElements.map(dse => dse.categoryCombo?.id))
            .compact()
            .uniq()
            .value();

        const categoryCombos$ = apiToFuture(
            this.api.metadata.get({
                categoryCombos: {
                    fields: categoryComboFields,
                },
            })
        ).map(res => {
            const filteredCategoryCombos = res.categoryCombos.filter(cc => categoryComboIds.includes(cc.id));
            return filteredCategoryCombos;
        });

        return categoryCombos$.map(categoryCombos => {
            const categoryComboById = _.keyBy(categoryCombos, getId);
            const categoryComboMapping = _(dataForm.dataSetElements)
                .map(dse => {
                    const customCategoryCombo = categoryComboById[dse.categoryCombo?.id];
                    return customCategoryCombo
                        ? ([dse.dataElement.id, customCategoryCombo] as [Id, D2CategoryCombo])
                        : undefined;
                })
                .compact()
                .fromPairs()
                .value();

            return _(dataForm.sections)
                .flatMap(section => section.dataElements)
                .map(d2DataElement => {
                    const customCategoryCombo = categoryComboMapping[d2DataElement.id];
                    const dataElementCategoryCombo = categoryComboById[d2DataElement.categoryCombo.id];
                    const categoryCombo = customCategoryCombo || dataElementCategoryCombo;
                    return categoryCombo ? getDataElement(d2DataElement, categoryCombo) : undefined;
                })
                .compact()
                .map(dataElement => [dataElement.id, dataElement] as [Id, typeof dataElement])
                .fromPairs()
                .value();
        });
    }
}

function getDataElement(d2DataElement: D2DataElement, d2CategoryCombo: D2CategoryCombo): DataElement | null {
    const { valueType } = d2DataElement;

    const optionSet = getOptionSet(d2DataElement);
    const disaggregation = getOptionsCategoryCombo(d2CategoryCombo);

    const base: Pick<DataElement, "id" | "name" | "code" | "options" | "disaggregation"> = {
        id: d2DataElement.id,
        code: d2DataElement.code,
        name: d2DataElement.formName || d2DataElement.displayName,
        options: optionSet ? { id: optionSet.id, isMultiple: false, items: optionSet.options } : undefined,
        disaggregation: disaggregation,
    };

    switch (valueType) {
        case "TEXT":
        case "LONG_TEXT":
            return { type: "TEXT", multiline: valueType === "LONG_TEXT", ...base };
        case "INTEGER":
        case "INTEGER_NEGATIVE":
        case "INTEGER_POSITIVE":
        case "INTEGER_ZERO_OR_POSITIVE":
        case "NUMBER":
            return { type: "NUMBER", numberType: valueType, ...base };
        case "BOOLEAN":
            return { type: "BOOLEAN", storeFalse: true, ...base };
        case "TRUE_ONLY":
            return { type: "BOOLEAN", storeFalse: false, ...base };
        default:
            console.error(
                `Data element [formName=${d2DataElement.formName}, id=${d2DataElement.id}, valueType=${d2DataElement.valueType}] skipped, valueType is not supported`
            );
            return null;
    }
}
function getOptionSet(dataElement: D2DataElement) {
    return dataElement.optionSet
        ? {
              ...dataElement.optionSet,
              options: dataElement.optionSet.options.map(option => ({
                  name: option.displayName,
                  value: option.code,
              })),
          }
        : null;
}

function getOptionsCategoryCombo(categoryCombo: D2CategoryCombo) {
    const categoryOptionsCartesian = _.product(...categoryCombo.categories.map(category => category.categoryOptions));

    return categoryOptionsCartesian.flatMap(categoryOptions => {
        return _(categoryCombo.categoryOptionCombos)
            .map((coc): Maybe<CategoryOptionCombo> => {
                const allCategoryOptionsMatch = _(categoryOptions).differenceBy(coc.categoryOptions, getId).isEmpty();

                return allCategoryOptionsMatch
                    ? { id: coc.id, name: categoryOptions.map(co => co.displayFormName || co.displayName).join(", ") }
                    : undefined;
            })
            .compact()
            .value();
    });
}

const categoryComboFields = {
    id: true,
    categories: { id: true, categoryOptions: { id: true, displayName: true, displayFormName: true } },
    categoryOptionCombos: { id: true, categoryOptions: { id: true } },
};

type D2CategoryCombo = MetadataPick<{
    categoryCombos: { fields: typeof categoryComboFields };
}>["categoryCombos"][number];
