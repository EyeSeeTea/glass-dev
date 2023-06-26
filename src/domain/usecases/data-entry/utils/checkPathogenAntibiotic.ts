import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/amr-external/RISData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkPathogenAntibiotic(
    risData: RISData[],
    pathogenAntibioticValidations: Record<string, string[]>
): ConsistencyError[] {
    const errors = _(
        risData.map((item, index) => {
            const allowPathogens = pathogenAntibioticValidations[item.PATHOGEN];

            if (!allowPathogens?.includes(item.ANTIBIOTIC)) {
                return {
                    error: i18n.t(
                        `The pathogen and antibiotic combination you have provided is not allowed. Pathogen ${item.PATHOGEN} antibiotic ${item.ANTIBIOTIC}`
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
