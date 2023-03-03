import { DataValuesSaveSummary } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";

export function mapToImportSummary(datasetImportStatus: DataValuesSaveSummary): ImportSummary {
    const nonBlockingErrors =
        datasetImportStatus.status === "WARNING"
            ? datasetImportStatus.conflicts?.map(status => {
                  return {
                      error: status.value,
                      count: 1,
                  };
              }) || []
            : [];

    const blokingErrors =
        datasetImportStatus.status === "ERROR"
            ? datasetImportStatus.conflicts?.map(status => {
                  return {
                      error: status.value,
                      count: 1,
                  };
              }) || []
            : [];

    const finalBlockingErrors = _.compact([
        ...blokingErrors,
        datasetImportStatus.importCount.ignored > 0
            ? {
                  error: "Import Ignored",
                  count: datasetImportStatus.importCount.ignored,
              }
            : undefined,
    ]);

    const status = finalBlockingErrors.length > 0 ? "ERROR" : nonBlockingErrors.length > 0 ? "WARNING" : "SUCCESS";

    return { status, nonBlockingErrors, blockingErrors: finalBlockingErrors };
}
