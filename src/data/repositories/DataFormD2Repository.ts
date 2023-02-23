import _ from "lodash";
import { getId, Id } from "../../domain/entities/Base";
import { DataForm, Section } from "../../domain/entities/DataForm";
import { Period } from "../../domain/entities/DataValue";
import { DataFormRepository } from "../../domain/repositories/DataFormRepository";
import { D2Api, MetadataPick } from "../../types/d2-api";
import { Dhis2DataElement } from "./D2DataElement";

/* Build DataForm objects from DHIS2 dataSet. It uses sections and " - " in dataElement.formName 
   as separator to group them in subsections. An example:
 *
 *    dataSet.section = ITNs. dataElements:
 *
 *    - ITNs - Basic - Written Policy
 *    - ITNs - Basic - Policy Implemented
 *    - ITNs - Extended - Written Policy
 *    - ITNs - Extended - Policy Implemented
 *
 *    This will create section ITNs:
 *
 *       - Subsection ITNs - Basic:
 *          - ITNs - Basic - Written Policy
 *          - ITNs - Basic - Policy Implemented
 *       - Subsection ITNs - Extended:
 *          - ITNs - Extended - Written Policy
 *          - ITNs - Extended - Policy Implemented
 *
 *   Further customization unsupported by DHIS2 is save in the dataStore (check type DataFormStoreConfig):
 *     - Data elements multi-selection populated from optionSet.
 **/

export class DataFormD2Repository implements DataFormRepository {
    constructor(private api: D2Api) {}

    async get(options: { id: Id; orgUnitId: Id; period: Period }): Promise<DataForm> {
        const metadata = await this.getMetadata(options);
        const dataSet = metadata.dataSets[0];
        if (!dataSet) return Promise.reject(new Error("Data set not found"));
        const sections = await this.getSections(dataSet);

        return {
            id: dataSet.id,
            dataElements: _.flatMap(sections, section => section.dataElements),
            sections: sections,
        };
    }

    private async getMetadata(options: { id: Id }) {
        const metadataQuery = getMetadataQuery({ dataSetId: options.id });
        return this.api.metadata.get(metadataQuery).getData();
    }

    private async getSections(dataSet: D2DataSet) {
        const dataElementIds = _(dataSet.sections)
            .flatMap(section => section.dataElements)
            .map(getId)
            .value();

        const dataElements = await new Dhis2DataElement(this.api).get(dataElementIds);

        return dataSet.sections.map((section): Section => {
            return {
                id: section.id,
                name: section.displayName,
                dataElements: _(section.dataElements)
                    .map(dataElementRef => dataElements[dataElementRef.id])
                    .compact()
                    .value(),
            };
        });
    }
}

type Metadata = ReturnType<typeof getMetadataQuery>;
type D2DataSet = MetadataPick<Metadata>["dataSets"][number];

function getMetadataQuery(options: { dataSetId: Id }) {
    return {
        dataSets: {
            fields: {
                id: true,
                code: true,
                sections: {
                    id: true,
                    code: true,
                    displayName: true,
                    dataElements: { id: true },
                },
            },
            filter: { id: { eq: options.dataSetId } },
        },
    } as const;
}
