import i18n from "../../../../locales";
import { isRISData } from "../../../entities/data-entry/external/ExternalData";
import { RISData } from "../../../entities/data-entry/external/RISData";
import { SampleData } from "../../../entities/data-entry/external/SampleData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkBatchId(risData: (RISData | SampleData)[], batchId: string): ConsistencyError[] {
    const getBatchId = (item: RISData | SampleData) => {
        if (isRISData(item)) {
            return item.BATCHIDR;
        } else {
            return item.BATCHIDS;
        }
    };

    const errors = _(
        risData
            .filter(item => {
                return getBatchId(item) !== batchId;
            })
            .map(item => {
                return i18n.t(
                    `Batchid is different: Selectd batchId to upload: ${batchId}, batchId in file: ${getBatchId(item)}`
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
