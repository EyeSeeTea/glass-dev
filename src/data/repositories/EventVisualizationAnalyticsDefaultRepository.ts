import { FutureData } from "../../domain/entities/Future";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { apiToFuture } from "../../utils/futures";
import { EventVisualizationAnalyticsRepository } from "../../domain/repositories/EventVisualizationAnalyticsRepository";
import { Id, Ref } from "../../domain/entities/Ref";
import { getProgramIdForModule } from "./utils/eventAnalyticsHelper";

interface EventVisualization {
    outputType: "EVENT" | string;
    dataElementDimensions: DataElementDimension[];
    columnDimensions: string[];
    simpleDimensions: SimpleDimension[];
}

interface DataElementDimension {
    programStage: Ref;
    dataElement: Ref;
    filter?: string;
}

interface SimpleDimension {
    parent: "COLUMN" | string;
    dimension: string;
    values: { values: string }[];
}

export class EventVisualizationAnalyticsDefaultRepository implements EventVisualizationAnalyticsRepository {
    constructor(private api: D2Api) {}

    downloadAllData(lineListId: Id, module: string): FutureData<Blob> {
        return apiToFuture(
            this.api.request<EventVisualization>({
                url: `eventVisualizations/${lineListId}?fields=columnDimensions,dataElementDimensions,outputType,outputIdScheme,eventDate,headers,stage,simpleDimensions`,
                method: "get",
            })
        ).flatMap(response => {
            console.debug(response);

            const eventDownloadQuery = this.parseLinelistMetadataToEventsQuery(response, module);

            return apiToFuture(
                this.api.request<Blob>({
                    url: eventDownloadQuery,
                    method: "get",
                    responseDataType: "raw",
                })
            );
        });
    }

    parseLinelistMetadataToEventsQuery = (lineListMetadata: EventVisualization, module: string): string => {
        const { programId, programStageId } = getProgramIdForModule(module);
        const dimensionStr = _(
            lineListMetadata.columnDimensions.map(colDimension => {
                if (colDimension === "ou") {
                    return "dimension=ou:USER_ORGUNIT";
                } else {
                    const curDEDimension = lineListMetadata.dataElementDimensions.find(
                        deDimension => deDimension.dataElement.id === colDimension
                    );

                    const curSimpleDimension = lineListMetadata.simpleDimensions.find(
                        simpleDimension => simpleDimension.dimension === colDimension
                    );

                    if (curDEDimension)
                        return `dimension=${curDEDimension.programStage.id}.${curDEDimension.dataElement.id}`;
                    else if (curSimpleDimension) {
                        return `${curSimpleDimension.dimension}=${curSimpleDimension.values.join(",")}`;
                    }
                }
            })
        )
            .compact()
            .join("&");

        const outputTypeStr = `&outputType=${lineListMetadata.outputType}&`;
        const stageStr = `stage=${programStageId}`;
        const eventDownloadQuery = `analytics/events/query/${programId}.csv?${dimensionStr}${outputTypeStr}${stageStr}`;

        return eventDownloadQuery;
    };
}
