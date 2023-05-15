import _ from "lodash";
import { Id } from "../../domain/entities/Base";
import { DataForm, Section } from "./DataForm";
import { Future, FutureData } from "../../domain/entities/Future";
import { D2Api, MetadataPick } from "../../types/d2-api";
import { apiToFuture } from "../../utils/futures";
import { DataElementD2Source } from "./DataElementD2Source";

export class DataFormD2Source {
    constructor(private api: D2Api) {}

    get(options: { id: Id }): FutureData<DataForm> {
        return this.getMetadata(options).flatMap(metadata => {
            const dataSet = metadata.dataSets[0];
            if (!dataSet) return Future.error("Data set not found");

            return this.getSections(dataSet).map((sections): DataForm => {
                return {
                    id: dataSet.id,
                    name: dataSet.displayName,
                    description: dataSet.displayDescription,
                    dataElements: _.flatMap(sections, section => section.dataElements),
                    sections: sections,
                };
            });
        });
    }

    private getMetadata(options: { id: Id }): FutureData<Metadata> {
        const metadataQuery = getMetadataQuery({ dataSetId: options.id });
        return apiToFuture(this.api.metadata.get(metadataQuery));
    }

    private getSections(dataSet: D2DataSet): FutureData<Section[]> {
        return new DataElementD2Source(this.api).get(dataSet).map(dataElements => {
            return dataSet.sections.map((section): Section => {
                return {
                    id: section.id,
                    code: section.code,
                    name: section.displayName,
                    dataElements: _(section.dataElements)
                        .map(dataElementRef => dataElements[dataElementRef.id])
                        .compact()
                        .value(),
                };
            });
        });
    }
}

type Metadata = MetadataPick<{ dataSets: { fields: typeof dataSetFields } }>;
export type D2DataSet = Metadata["dataSets"][number];
export type D2DataElement = D2DataSet["sections"][number]["dataElements"][number];

const dataSetFields = {
    id: true,
    displayName: true,
    displayDescription: true,
    code: true,
    dataSetElements: { dataElement: { id: true }, categoryCombo: { id: true } },
    sections: {
        id: true,
        code: true,
        displayName: true,
        dataElements: {
            id: true,
            code: true,
            displayName: true,
            formName: true,
            valueType: true,
            categoryCombo: { id: true },
            optionSet: {
                id: true,
                options: { id: true, displayName: true, code: true },
            },
        },
    },
} as const;

function getMetadataQuery(options: { dataSetId: Id }) {
    return {
        dataSets: { fields: dataSetFields, filter: { id: { eq: options.dataSetId } } },
    };
}
