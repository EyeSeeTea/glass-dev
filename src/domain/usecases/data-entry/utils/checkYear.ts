import _ from "lodash";
import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/amr-external/RISData";
import { SampleData } from "../../../entities/data-entry/amr-external/SampleData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkYear(fileData: (RISData | SampleData)[], year: string): ConsistencyError[] {
    const errors = _(
        fileData.map((item, index) => {
            if (item.YEAR.toString() !== year) {
                return {
                    error: i18n.t(
                        `Year is different: Selected Data Submission Year : ${year}, Year in file: ${item.YEAR}`
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
