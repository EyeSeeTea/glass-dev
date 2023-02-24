import "lodash.product";
import _ from "lodash";
import { getId, Id } from "../../domain/entities/Base";
import { DataElement, Disaggregation } from "./DataElement";
import { D2Api, MetadataPick } from "../../types/d2-api";
import { Maybe } from "../../types/utils";
import { Future, FutureData } from "../../domain/entities/Future";
import { apiToFuture } from "../../utils/futures";

export class DataElementD2Source {
    constructor(private api: D2Api) {}

    get(ids: Id[]): FutureData<Record<Id, DataElement>> {
        const idGroups = _(ids).uniq().chunk(100).value();

        const resList$ = Future.sequential(
            idGroups.map(idsGroup =>
                apiToFuture(
                    this.api.metadata.get({
                        dataElements: {
                            fields: dataElementFields,
                            filter: { id: { in: idsGroup } },
                        },
                    })
                )
            )
        );

        return resList$.map(resList => {
            return _(resList)
                .flatMap(res => res.dataElements)
                .map(d2DataElement => getDataElement(d2DataElement))
                .compact()
                .map(dataElement => [dataElement.id, dataElement] as [Id, typeof dataElement])
                .fromPairs()
                .value();
        });
    }
}

function getDataElement(dataElement: D2DataElement): DataElement | null {
    const { valueType } = dataElement;

    const optionSet = getOptionSet(dataElement);
    const optionsFromDataElementCategoryCombo = getOptionsCategoryCombo(dataElement);

    const base: Pick<DataElement, "id" | "name" | "options" | "disaggregation"> = {
        id: dataElement.id,
        name: dataElement.formName || dataElement.displayName,
        options: optionSet ? { id: optionSet.id, isMultiple: false, items: optionSet.options } : undefined,
        disaggregation: optionsFromDataElementCategoryCombo,
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
        case "TRUE_ONLY":
            return { type: "BOOLEAN", ...base };
        default:
            console.error(
                `Data element [formName=${dataElement.formName}, id=${dataElement.id}, valueType=${dataElement.valueType}] skipped, valueType is not supported`
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

function getOptionsCategoryCombo(dataElement: D2DataElement) {
    const categoryOptionsCartesian = _.product(
        ...dataElement.categoryCombo.categories.map(category => category.categoryOptions)
    );

    return categoryOptionsCartesian.flatMap(categoryOptions => {
        return _(dataElement.categoryCombo.categoryOptionCombos)
            .map((coc): Maybe<Disaggregation> => {
                const allCategoryOptionsMatch = _(categoryOptions).differenceBy(coc.categoryOptions, getId).isEmpty();

                return allCategoryOptionsMatch
                    ? { id: coc.id, name: categoryOptions.map(co => co.displayName).join(", ") }
                    : undefined;
            })
            .compact()
            .value();
    });
}

const dataElementFields = {
    id: true,
    code: true,
    displayName: true,
    formName: true,
    valueType: true,
    optionSet: {
        id: true,
        options: { id: true, displayName: true, code: true },
    },
    categoryCombo: {
        id: true,
        categories: { id: true, categoryOptions: { id: true, displayName: true } },
        categoryOptionCombos: { id: true, categoryOptions: { id: true } },
    },
} as const;

type D2DataElement = MetadataPick<{
    dataElements: { fields: typeof dataElementFields };
}>["dataElements"][number];
