import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/external/RISData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkASTResults(risData: RISData[]): ConsistencyError[] {
    const errors = _(
        risData
            .filter(item => {
                return (
                    (item.RESISTANT === 0 || !item.RESISTANT) &&
                    (item.INTERMEDIATE === 0 || !item.INTERMEDIATE) &&
                    (item.SUSCEPTIBLE === 0 || !item.SUSCEPTIBLE) &&
                    (item.NONSUSCEPTIBLE === 0 || !item.NONSUSCEPTIBLE) &&
                    (item.UNKNOWN_NO_AST === 0 || !item.UNKNOWN_NO_AST) &&
                    (item.UNKNOWN_NO_BREAKPOINTS === 0 || !item.UNKNOWN_NO_BREAKPOINTS)
                );
            })
            .map(() => {
                return i18n.t(`The AST results provided are not valid (either they are all empty or equal to 0)`);
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
