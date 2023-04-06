import i18n from "../../../../locales";
import { RISData } from "../../../entities/data-entry/external/RISData";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";

export function checkASTResults(risData: RISData[]): ConsistencyError[] {
    const errors = _(
        risData.map((item, index) => {
            if (
                item.RESISTANT === null &&
                item.INTERMEDIATE === null &&
                item.SUSCEPTIBLE === null &&
                item.NONSUSCEPTIBLE === null &&
                item.UNKNOWN_NO_AST === null &&
                item.UNKNOWN_NO_BREAKPOINTS === null
            ) {
                return {
                    error: i18n.t(`The AST results provided are not valid (they are all empty)`),
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
