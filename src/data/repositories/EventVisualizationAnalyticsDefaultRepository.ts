import { FutureData, Future } from "../../domain/entities/Future";
import { D2Api } from "@eyeseetea/d2-api/2.34";
import { apiToFuture } from "../../utils/futures";
import { EventVisualizationAnalyticsRepository } from "../../domain/repositories/EventVisualizationAnalyticsRepository";
import { Id, Ref } from "../../domain/entities/Ref";
import { LineListDetails } from "../../domain/entities/GlassModule";

interface EventVisualization {
    name: string;
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

    getLineListName(lineListId: Id): FutureData<string> {
        return apiToFuture(
            this.api.request<EventVisualization>({
                url: `eventVisualizations/${lineListId}?fields=name`,
                method: "get",
            })
        ).flatMap(response => {
            return Future.success(response.name);
        });
    }

    downloadAllData(lineListDetails: LineListDetails): FutureData<Blob> {
        return apiToFuture(
            this.api.request<EventVisualization>({
                url: `eventVisualizations/${lineListDetails.id}?fields=columnDimensions,dataElementDimensions,outputType,headers,stage,simpleDimensions`,
                method: "get",
            })
        ).flatMap(response => {
            const eventDownloadQuery = this.parseLinelistMetadataToEventsQuery(response, lineListDetails);

            if (!eventDownloadQuery)
                return Future.error("No program data for given line listing and corresponding module");

            return apiToFuture(
                this.api.request<Blob>({
                    url: eventDownloadQuery,
                    method: "get",
                    responseDataType: "raw",
                })
            );
        });
    }

    parseLinelistMetadataToEventsQuery = (
        lineListMetadata: EventVisualization,
        lineListDetails: LineListDetails
    ): string | undefined => {
        if (!lineListDetails) return undefined;

        const { programId, programStageId } = lineListDetails;
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
        const paging = `paging=false&`;
        const stageStr = programStageId ? `stage=${programStageId}` : "";

        const eventDownloadQuery = `analytics/events/query/${programId}.csv?${dimensionStr}${outputTypeStr}${paging}${stageStr}`;

        return eventDownloadQuery;
    };
}
