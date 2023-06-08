import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/amr-external/RISData";
import { SampleData } from "../../../entities/data-entry/amr-external/SampleData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkCountry(fileData: (RISData | SampleData)[], country: string): ConsistencyError[] {
    const errors = _(
        fileData.map((item, index) => {
            if (item.COUNTRY !== country) {
                return {
                    error: i18n.t(
                        `Country is different: Selected Data Submission Country : ${country}, Country in file: ${item.COUNTRY}`
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
