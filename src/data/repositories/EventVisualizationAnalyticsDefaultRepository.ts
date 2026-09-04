import _ from "lodash";

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
                // `headers` was previously requested here but never declared on EventVisualization nor
                // read anywhere, so it only made the payload look load-bearing. Dropped deliberately:
                // letting an unverified saved field start influencing which columns get exported is
                // exactly the kind of silent change this export cannot afford.
                url: `eventVisualizations/${lineListDetails.id}?fields=columnDimensions,dataElementDimensions,outputType,stage,simpleDimensions`,
                method: "get",
            })
        ).flatMap(response => {
            const eventDownloadQuery = this.parseLinelistMetadataToEventsQuery(response, lineListDetails);

            if (!eventDownloadQuery)
                return Future.error("No program data for given line listing and corresponding module");

            // The analytics query addresses data elements by UID (`<stageUid>.<dataElementUid>`), so the
            // CSV comes back with those UIDs as column headers while dimensions like `ou` and the simple
            // dimensions are labelled readably by DHIS2 — which is why some line lists looked fine and
            // others looked like machine output. Rather than ask analytics to relabel everything (which
            // would also rewrite the VALUES into names), the header row alone is remapped to readable
            // names here; every data value is left exactly as DHIS2 returned it, still as codes.
            const dataElementIds = response.dataElementDimensions.map(dimension => dimension.dataElement.id);

            return Future.joinObj({
                csv: apiToFuture(
                    this.api.request<Blob>({
                        url: eventDownloadQuery,
                        method: "get",
                        responseDataType: "raw",
                    })
                ),
                namesById: this.getDataElementHeaderNames(dataElementIds),
            }).flatMap(({ csv, namesById }) => Future.fromPromise(replaceCsvHeaderIds(csv, namesById)));
        });
    }

    /** Readable label per data element UID, preferring the form name (same precedence the Excel template builder uses). */
    private getDataElementHeaderNames(dataElementIds: Id[]): FutureData<Map<string, string>> {
        if (dataElementIds.length === 0) return Future.success(new Map());

        return apiToFuture(
            this.api.models.dataElements.get({
                fields: { id: true, name: true, formName: true, shortName: true },
                filter: { id: { in: dataElementIds } },
                paging: false,
            })
        ).map(
            ({ objects }) =>
                new Map(objects.map(de => [de.id, de.formName || de.name || de.shortName || de.id] as const))
        );
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

                    // Neither a data element nor a simple dimension — e.g. a tracked entity attribute or
                    // program indicator column. Only dataElementDimensions/simpleDimensions are fetched
                    // above, so such a column cannot be resolved here, and the .compact() below would
                    // DELETE it, producing a CSV that is silently missing a column the line list shows.
                    // Exporting less than the user configured must never pass unnoticed, so it is
                    // reported here; representing these dimensions properly is the real fix.
                    console.warn(
                        `[line list export] Column dimension "${colDimension}" of line list ` +
                            `${lineListDetails.id} is neither a data element nor a simple dimension ` +
                            `(likely a tracked entity attribute or program indicator). It cannot be ` +
                            `represented in the analytics query, so this column is MISSING from the ` +
                            `exported CSV.`
                    );
                    return undefined;
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

// Only the first chunk of the CSV is decoded to find the header row; the remaining bytes are re-attached
// as an untouched Blob slice, so a large export is never materialized as a JavaScript string.
const HEADER_SCAN_BYTES = 128 * 1024;

/**
 * Rewrites ONLY the first (header) line of an analytics CSV, replacing data element UIDs with readable
 * names. Every subsequent byte — i.e. all the data values — is passed through unchanged, so values stay
 * as the codes DHIS2 returned. Cells that aren't a known UID (org unit, event date, …) are left as-is.
 */
async function replaceCsvHeaderIds(csv: Blob, namesById: Map<string, string>): Promise<Blob> {
    if (namesById.size === 0) return csv;

    const headChunk = await csv.slice(0, HEADER_SCAN_BYTES).text();
    const newlineIndex = headChunk.indexOf("\n");

    // No newline in the scanned chunk: the response is at most a header row (no data), so rewrite it whole.
    if (newlineIndex === -1) {
        return new Blob([rewriteHeaderLine(headChunk, namesById)], { type: csv.type });
    }

    const rewrittenHeader = rewriteHeaderLine(headChunk.slice(0, newlineIndex), namesById);
    // Byte length (not string length) of the consumed header + newline, so the remaining slice stays aligned
    // even when the header contains multi-byte UTF-8 characters.
    const consumedBytes = new TextEncoder().encode(headChunk.slice(0, newlineIndex + 1)).length;

    return new Blob([`${rewrittenHeader}\n`, csv.slice(consumedBytes)], { type: csv.type });
}

// Exported for unit testing: this is the whole of the id -> readable-name mapping and CSV re-quoting.
export function rewriteHeaderLine(line: string, namesById: Map<string, string>): string {
    const hasCarriageReturn = line.endsWith("\r");
    const bareLine = hasCarriageReturn ? line.slice(0, -1) : line;
    const headers = splitCsvLine(bareLine).map(cell => toReadableHeader(cell, namesById));
    return formatCsvLine(headers) + (hasCarriageReturn ? "\r" : "");
}

// A header cell is either a bare data element UID or `<programStageUid>.<dataElementUid>`.
function toReadableHeader(cell: string, namesById: Map<string, string>): string {
    const directMatch = namesById.get(cell);
    if (directMatch) return directMatch;

    const separatorIndex = cell.lastIndexOf(".");
    if (separatorIndex !== -1) {
        const qualifiedMatch = namesById.get(cell.slice(separatorIndex + 1));
        if (qualifiedMatch) return qualifiedMatch;
    }

    return cell;
}

function splitCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index++) {
        const character = line.charAt(index);

        if (inQuotes) {
            if (character !== '"') current += character;
            else if (line.charAt(index + 1) === '"') {
                current += '"';
                index++;
            } else inQuotes = false;
        } else if (character === '"') inQuotes = true;
        else if (character === ",") {
            cells.push(current);
            current = "";
        } else current += character;
    }
    cells.push(current);

    return cells;
}

function formatCsvLine(cells: string[]): string {
    return cells.map(cell => (/[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(",");
}
