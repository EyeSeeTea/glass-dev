import { FormFieldState, getAllFieldsFromSections } from "../FormFieldsState";
import { FormRule } from "../FormRule";
import { FormRuleExecEvent, getFormRuleImplementation } from "../FormRulesImplementation";
import { FormState } from "../FormState";

export function applyRulesInFormState<ContextType extends object>(
    currentFormState: FormState,
    triggerField: FormFieldState,
    formRules: FormRule[],
    event: FormRuleExecEvent,
    context?: ContextType
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
                getFormRuleImplementation(rule.type)({
                    section,
                    triggerField,
                    rule,
                    formState,
                    event,
                    context: context,
                })
            ),
        };
    }, currentFormState);

    return formStateWithRulesApplied;
}

/**
 * @todo This is a workaround to apply rules after the initial form state is created
 * It does not take into account dependencies between fields
 */
export function applyRulesToAllFieldsInFormState<ContextType extends object>(
    currentFormState: FormState,
    formRules: FormRule[],
    context?: ContextType
): FormState {
    const allFields = getAllFieldsFromSections(currentFormState.sections);
    return allFields.reduce((formState, field) => {
        return applyRulesInFormState(formState, field, formRules, "load", context);
    }, currentFormState);
}
