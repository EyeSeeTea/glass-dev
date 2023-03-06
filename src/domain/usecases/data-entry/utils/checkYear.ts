import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/external/RISData";
import { SampleData } from "../../../entities/data-entry/external/SampleData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkYear(risData: (RISData | SampleData)[], year: number): ConsistencyError[] {
    const errors = _(
        risData
            .filter(item => {
                return item.YEAR !== year;
            })
            .map(item => {
                return i18n.t(`Year is different: Selected Data Submission Year : ${year}, Year in file: ${item.YEAR}`);
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
