import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/amr-external/RISData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkSpecimenPathogen(
    risData: RISData[],
    specimenPathogenValidations: Record<string, string[]>
): ConsistencyError[] {
    const errors = _(
        risData.map((item, index) => {
            const allowPathogens = specimenPathogenValidations[item.SPECIMEN];

            if (!allowPathogens?.includes(item.PATHOGEN)) {
                return {
                    error: i18n.t(
                        `The specimen and pathogen combination you have provided is not allowed. Specimen ${item.SPECIMEN} Pathogen ${item.PATHOGEN}`
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
