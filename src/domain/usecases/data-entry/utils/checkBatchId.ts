import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/external/RISData";
import { SampleData } from "../../../entities/data-entry/external/SampleData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkBatchId(risData: (RISData | SampleData)[], batchId: string): ConsistencyError[] {
    const errors = _(
        risData.map((item, index) => {
            if (item.BATCHIDDS !== batchId) {
                return {
                    error: i18n.t(
                        `Batchid is different: Selectd batchId to upload: ${batchId}, batchId in file: ${item.BATCHIDDS}`
                    ),
                    line: index + 1,
                };
            }
        })
    )
        .omitBy(_.isNil)
        .groupBy(error => error?.error)
        .mapValues(value => value.map(el => el?.line || 0))
        .value();

    return Object.keys(errors).map(error => ({
        error: error,
        count: errors[error]?.length || 0,
        lines: errors[error] || [],
    }));
}
