import i18n from "@eyeseetea/d2-ui-components/locales";
import { DataValuesSaveSummary } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";

export function mapDataValuesToImportSummary(dhis2Summary: DataValuesSaveSummary): ImportSummary {
    const nonBlockingErrors =
        dhis2Summary.status === "WARNING"
            ? dhis2Summary.conflicts?.map(status => {
                  return {
                      error: status.value,
                      count: 1,
                  };
              }) || []
            : [];

    const ignoreErrors =
        dhis2Summary.importCount.ignored > 0 && dhis2Summary.conflicts?.length === 0
            ? [
                  {
                      error: i18n.t(
                          "Although your import was succesful, some values in the import have been ignored. Check your file for duplicates - duplicates will be ignored."
                      ),
                      count: dhis2Summary.importCount.ignored,
                  },
              ]
            : [];

    const finalNonBlockingErrors = _.compact([...nonBlockingErrors, ...ignoreErrors]);

    const blokingErrors =
        dhis2Summary.status === "ERROR"
            ? dhis2Summary.conflicts?.map(status => {
                  return {
                      error: status.value,
                      count: 1,
                  };
              }) || []
            : [];

    const finalBlockingErrors = _.compact([...blokingErrors]);

    const status = finalBlockingErrors.length > 0 ? "ERROR" : finalNonBlockingErrors.length > 0 ? "WARNING" : "SUCCESS";

    return {
        status,
        nonBlockingErrors: finalNonBlockingErrors,
        blockingErrors: finalBlockingErrors,
        importCount: dhis2Summary.importCount,
    };
}
