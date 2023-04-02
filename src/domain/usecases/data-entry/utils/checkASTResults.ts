import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/external/RISData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkASTResults(risData: RISData[]): ConsistencyError[] {
    const errors = _(
        risData.map((item, index) => {
            if (
                (item.RESISTANT === 0 || !item.RESISTANT) &&
                (item.INTERMEDIATE === 0 || !item.INTERMEDIATE) &&
                (item.SUSCEPTIBLE === 0 || !item.SUSCEPTIBLE) &&
                (item.NONSUSCEPTIBLE === 0 || !item.NONSUSCEPTIBLE) &&
                (item.UNKNOWN_NO_AST === 0 || !item.UNKNOWN_NO_AST) &&
                (item.UNKNOWN_NO_BREAKPOINTS === 0 || !item.UNKNOWN_NO_BREAKPOINTS)
            ) {
                return {
                    error: i18n.t(`The AST results provided are not valid (either they are all empty or equal to 0)`),
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
