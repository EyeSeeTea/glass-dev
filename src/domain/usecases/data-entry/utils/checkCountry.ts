import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/external/RISData";
import { SampleData } from "../../../entities/data-entry/external/SampleData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkCountry(fileData: (RISData | SampleData)[], country: string): ConsistencyError[] {
    const errors = _(
        fileData
            .filter(item => {
                return item.COUNTRY !== country;
            })
            .map(item => {
                return i18n.t(
                    `Country is different: Selected Data Submission Country : ${country}, Country in file: ${item.COUNTRY}`
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
