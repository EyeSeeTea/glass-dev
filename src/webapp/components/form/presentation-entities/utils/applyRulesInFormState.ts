import { FormFieldState, getAllFieldsFromSections } from "../FormFieldsState";
import { FormRule } from "../FormRule";
import { FormRuleExecEvent, FormRulesImplementation } from "../FormRulesImplementation";
import { FormState } from "../FormState";

export function applyRulesInFormState(
    currentFormState: FormState,
    triggerField: FormFieldState,
    formRules: FormRule[],
    event: FormRuleExecEvent
): FormState {
    const filteredRulesByFieldId = formRules.filter(rule =>
        "fieldIds" in rule ? rule.fieldIds.includes(triggerField.id) : rule.fieldId === triggerField.id
    );

    if (filteredRulesByFieldId.length === 0) {
        return currentFormState;
    }

    const formStateWithRulesApplied = filteredRulesByFieldId.reduce((formState, rule) => {
        return {
            ...formState,
            sections: formState.sections.map(section =>
                FormRulesImplementation[rule.type]({ section, triggerField, rule, formState, event })
            ),
        };
    }, currentFormState);

    return formStateWithRulesApplied;
}

/**
 * @todo This is a workaround to apply rules after the initial form state is created
 * It does not take into account dependencies between fields
 */
export function applyRulesToAllFieldsInFormState(currentFormState: FormState, formRules: FormRule[]): FormState {
    const allFields = getAllFieldsFromSections(currentFormState.sections);
    return allFields.reduce((formState, field) => {
        return applyRulesInFormState(formState, field, formRules, "load");
    }, currentFormState);
}
