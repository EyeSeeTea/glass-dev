import { DataValuesSaveSummary } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";

export function mapToImportSummary(dhis2Summary: DataValuesSaveSummary): ImportSummary {
    const nonBlockingErrors =
        dhis2Summary.status === "WARNING"
            ? dhis2Summary.conflicts?.map(status => {
                  return {
                      error: status.value,
                      count: 1,
                  };
              }) || []
            : [];

    const blokingErrors =
        dhis2Summary.status === "ERROR"
            ? dhis2Summary.conflicts?.map(status => {
                  return {
                      error: status.value,
                      count: 1,
                  };
              }) || []
            : [];

    const finalBlockingErrors = _.compact([
        ...blokingErrors,
        dhis2Summary.importCount.ignored > 0
            ? {
                  error: "Import Ignored",
                  count: dhis2Summary.importCount.ignored,
              }
            : undefined,
    ]);

    const status = finalBlockingErrors.length > 0 ? "ERROR" : nonBlockingErrors.length > 0 ? "WARNING" : "SUCCESS";

    return { status, nonBlockingErrors, blockingErrors: finalBlockingErrors, importCount: dhis2Summary.importCount };
}
