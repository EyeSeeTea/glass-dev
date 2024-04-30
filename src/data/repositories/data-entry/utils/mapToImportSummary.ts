import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { D2Api } from "../../../../types/d2-api";
import { Dictionary } from "../../../../types/utils";
import { Future, FutureData } from "../../../../domain/entities/Future";
import { Id } from "../../../../domain/entities/Ref";
import { ConsistencyError, ImportSummary } from "../../../../domain/entities/data-entry/ImportSummary";
import { getDataElementNames } from "../../utils/getDataElementNames";

export function mapToImportSummary(params: {
    result: TrackerPostResponse;
    type: "event" | "trackedEntity";
    api: D2Api;
    nonBlockingErrors?: ConsistencyError[];
    eventIdLineNoMap?: { id: string; lineNo: number }[];
}): FutureData<{
    importSummary: ImportSummary;
    eventIdList: string[];
}> {
    const { result, type, api, nonBlockingErrors, eventIdLineNoMap } = params;

    if (result && result.validationReport && result.stats) {
        const errorDataElementIds = getDataElementIdsFromReport(result.validationReport.errorReports);
        const warningDataElemtIds = getDataElementIdsFromReport(result.validationReport.warningReports);

        const blockingErrorsByGroup = getErrorsGroupedByMessageError(result.validationReport.errorReports);
        const warningErrorsByGroup = getErrorsGroupedByMessageError(result.validationReport.warningReports);

        return getDataElementNames(api, [...errorDataElementIds, ...warningDataElemtIds]).flatMap(dataElementMap => {
            const importSummary: ImportSummary = {
                status: result.status === "OK" ? "SUCCESS" : result.status,
                importCount: {
                    imported: result.stats.created,
                    updated: result.stats.updated,
                    ignored: result.stats.ignored,
                    deleted: result.stats.deleted,
                    total: result.stats.total,
                },
                blockingErrors: Object.entries(blockingErrorsByGroup).map(err => {
                    const dataElementInErrMsg = errorDataElementIds.filter(de => err[0].includes(de));

                    if (dataElementInErrMsg && dataElementInErrMsg[0] && dataElementInErrMsg.length === 1) {
                        //There should be only one dataelement id in each errMsg

                        const dataElementName = dataElementMap.find(de => de.id === dataElementInErrMsg[0]);
                        //Replace DataElement Ids with DataElement Names in error messages.
                        const parsedErrMsg = err[0].replace(
                            dataElementInErrMsg[0],
                            dataElementName?.name ?? dataElementInErrMsg[0]
                        );

                        const lines = err[1].flatMap(a => eventIdLineNoMap?.find(e => e.id === a.eventId)?.lineNo);
                        console.debug(lines);
                        return {
                            error: parsedErrMsg,
                            count: err[1].length,
                            lines: _.compact(lines),
                        };
                    } else {
                        const lines = err[1].flatMap(a => eventIdLineNoMap?.find(e => e.id === a.eventId)?.lineNo);
                        return { error: err[0], count: err[1].length, lines: _.compact(lines) };
                    }
                }),
                nonBlockingErrors: nonBlockingErrors ? nonBlockingErrors : [],
                warningErrors: Object.entries(warningErrorsByGroup).map(err => {
                    const dataElementInErrMsg = warningDataElemtIds.filter(de => err[0].includes(de));

                    if (dataElementInErrMsg && dataElementInErrMsg[0] && dataElementInErrMsg.length === 1) {
                        //There should be only one dataelement id in each errMsg

                        const dataElementName = dataElementMap.find(de => de.id === dataElementInErrMsg[0]);
                        //Replace DataElement Ids with DataElement Names in error messages.
                        const parsedErrMsg = err[0].replace(
                            dataElementInErrMsg[0],
                            dataElementName?.name ?? dataElementInErrMsg[0]
                        );

                        const lines = err[1].flatMap(a => eventIdLineNoMap?.find(e => e.id === a.eventId)?.lineNo);
                        console.debug(lines);
                        return {
                            error: parsedErrMsg,
                            count: err[1].length,
                            lines: _.compact(lines),
                        };
                    } else {
                        const lines = err[1].flatMap(a => eventIdLineNoMap?.find(e => e.id === a.eventId)?.lineNo);
                        return { error: err[0], count: err[1].length, lines: _.compact(lines) };
                    }
                }),
                importTime: new Date(),
            };

            const eventIdList =
                result.status === "OK"
                    ? type === "event"
                        ? result.bundleReport.typeReportMap.EVENT.objectReports.map(report => report.uid)
                        : result.bundleReport.typeReportMap.TRACKED_ENTITY.objectReports.map(report => report.uid)
                    : [];

            return Future.success({ importSummary, eventIdList: _.compact(eventIdList) });
        });
    } else {
        return Future.success({
            importSummary: {
                status: "ERROR",
                importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
                nonBlockingErrors: [],
                blockingErrors: [{ error: result?.message ?? "An error occurred during import. ", count: 1 }],
            },
            eventIdList: [],
        });
    }
}

function getDataElementIdsFromReport(errorReports: TrackerPostResponse["validationReport"]["errorReports"]): Id[] {
    const blockingErrorList = _.compact(
        errorReports.map(summary => {
            if (summary.message) return { error: summary.message, eventId: summary.uid };
        })
    );

    const blockingErrorsByGroup = _(blockingErrorList).groupBy("error").value();

    //Get list of DataElement Ids in error messages.
    return _.compact(
        Object.entries(blockingErrorsByGroup).map(err => {
            const errMsg = err[0];

            //Error message type 1 contains regex in format : DataElement `{dataElementId}`
            const pattern1 = /(?<=DataElement )`([A-Za-z0-9]{11})`/g;
            const dataelementIds1 = pattern1.exec(errMsg);

            //Error message type 2 contains  regex in format : {dataElementId} DataElement
            const pattern2 = /([A-Za-z0-9]{11}) DataElement/g;
            const dataelementsIds2 = pattern2.exec(errMsg);

            //Error message type 3 contains  regex in format : `DataElement``{dataElementId}`
            const pattern3 = /`(DataElement)` `([A-Za-z0-9]{11})`/g;
            const dataelementsIds3 = pattern3.exec(errMsg);

            if (dataelementIds1 && dataelementIds1[1]) return dataelementIds1[1];
            else if (dataelementsIds2 && dataelementsIds2[1]) return dataelementsIds2[1];
            else if (dataelementsIds3 && dataelementsIds3[1]) return dataelementsIds3[2];
        })
    );
}

function getErrorsGroupedByMessageError(
    errorReports: TrackerPostResponse["validationReport"]["errorReports"]
): Dictionary<
    {
        error: string;
        eventId: string;
    }[]
> {
    const blockingErrorList = _.compact(
        errorReports.map(summary => {
            if (summary.message) return { error: summary.message, eventId: summary.uid };
        })
    );

    return _(blockingErrorList).groupBy("error").value();
}
