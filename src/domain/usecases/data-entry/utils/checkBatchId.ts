import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/external/RISData";
import { SampleData } from "../../../entities/data-entry/external/SampleData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkBatchId(risData: (RISData | SampleData)[], batchId: string): ConsistencyError[] {
    const errors = _(
        risData
            .filter(item => {
                return item.BATCHIDDS !== batchId;
            })
            .map(item => {
                return i18n.t(
                    `Batchid is different: Selectd batchId to upload: ${batchId}, batchId in file: ${item.BATCHIDDS}`
                );
            })
    )
        .groupBy(error => error)
        .mapValues(values => values.length)
        .value();

    return Object.keys(errors).map(error => ({
        error,
        count: errors[error] || 0,
    }));
}
