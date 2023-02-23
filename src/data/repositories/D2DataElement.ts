import _ from "lodash";
import { Id } from "../../domain/entities/Base";
import { DataElement } from "../../domain/entities/DataElement";
import { D2Api, MetadataPick } from "../../types/d2-api";

export class Dhis2DataElement {
    constructor(private api: D2Api) {}

    async get(ids: Id[]): Promise<Record<Id, DataElement>> {
        const idGroups = _(ids).uniq().chunk(100).value();

        const resList = await promiseMap(idGroups, idsGroup =>
            this.api.metadata
                .get({
                    dataElements: {
                        fields: dataElementFields,
                        filter: { id: { in: idsGroup } },
                    },
                })
                .getData()
        );

        return _(resList)
            .flatMap(res => res.dataElements)
            .map(d2DataElement => getDataElement(d2DataElement))
            .compact()
            .map(dataElement => [dataElement.id, dataElement] as [Id, typeof dataElement])
            .fromPairs()
            .value();
    }
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
} as const;

type D2DataElement = MetadataPick<{ dataElements: { fields: typeof dataElementFields } }>["dataElements"][number];

function getDataElement(dataElement: D2DataElement): DataElement | null {
    const { valueType } = dataElement;
    const optionSetFromDataElement = dataElement.optionSet
        ? {
              ...dataElement.optionSet,
              options: dataElement.optionSet.options.map(option => ({
                  name: option.displayName,
                  value: option.code,
              })),
          }
        : null;
    const optionSet =  optionSetFromDataElement;

    const base = {
        id: dataElement.id,
        name: dataElement.formName || dataElement.displayName,
        options: optionSet
            ? { isMultiple: false, items: optionSet.options }
            : undefined,
    };

    switch (valueType) {
        case "TEXT":
        case "LONG_TEXT":
            return { type: "TEXT", ...base };
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
                `Data element [formName=${dataElement.formName}, id=${dataElement.id}, valueType=${dataElement.valueType}] skipped, valueType not supported`
            );
            return null;
    }
}


function promiseMap<T, S>(inputValues: T[], mapper: (value: T) => Promise<S>): Promise<S[]> {
    const reducer = (acc$: Promise<S[]>, inputValue: T): Promise<S[]> =>
        acc$.then((acc: S[]) =>
            mapper(inputValue).then(result => {
                acc.push(result);
                return acc;
            })
        );
    return inputValues.reduce(reducer, Promise.resolve([]));
}
