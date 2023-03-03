import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/external/RISData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkSpecimenPathogen(
    risData: RISData[],
    specimenPathogenValidations: Record<string, string[]>
): ConsistencyError[] {
    const errors = _(
        risData
            .filter(item => {
                const allowPathogens = specimenPathogenValidations[item.SPECIMEN];

                return !allowPathogens?.includes(item.PATHOGEN);
            })
            .map(errorItem => {
                return i18n.t(
                    `The specimen and pathogen combination you have provided is not allowed. Specimen ${errorItem.SPECIMEN} Pathogen ${errorItem.PATHOGEN}`
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
