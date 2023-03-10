import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/external/RISData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkPathogenAntibiotic(
    risData: RISData[],
    pathogenAntibioticValidations: Record<string, string[]>
): ConsistencyError[] {
    const errors = _(
        risData
            .filter(item => {
                const allowPathogens = pathogenAntibioticValidations[item.PATHOGEN];

                return !allowPathogens?.includes(item.ANTIBIOTIC);
            })
            .map(errorItem => {
                return i18n.t(
                    `The pathogen and antibiotic combination you have provided is not allowed. Pathogen ${errorItem.PATHOGEN} antibiotic ${errorItem.ANTIBIOTIC}`
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
