import _ from "lodash";
import i18n from "../../../../locales";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";
import { DataSetValidation } from "../../../entities/metadata/DataSetValidation";

export function checkDhis2Validations(
    validations: DataSetValidation[],
    rulesInstructions: { id: string; instruction: string }[]
): ConsistencyError[] {
    const errors = _(
        validations.map(({ validationRuleViolations }) => {
            if (validationRuleViolations.length) {
                return validationRuleViolations.map(rulesViolation => {
                    return i18n.t(
                        `Validation rule '${(rulesViolation as any).validationRule.name}' violated. Left side value: '${
                            (rulesViolation as any).leftsideValue
                        }', right side value: '${(rulesViolation as any).rightsideValue}'. Instructions: ${
                            rulesInstructions.find(
                                instruction => instruction.id === (rulesViolation as any).validationRule.id
                            )?.instruction || "-"
                        }`
                    );
                });
            }
        })
    )
        .omitBy(_.isUndefined)
        .groupBy(error => error)
        .mapValues(values => values.length)
        .value();

    return Object.keys(errors).map(error => ({
        error,
        count: errors[error] || 0,
    }));
}
