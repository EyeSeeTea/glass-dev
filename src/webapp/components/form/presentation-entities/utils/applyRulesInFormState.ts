import { FormFieldState } from "../FormFieldsState";
import { FormRule } from "../FormRule";
import { setRequiredFieldsByFieldValueInSection } from "../FormSectionsState";
import { FormState } from "../FormState";

export function applyRulesInFormState(
    currentFormState: FormState,
    updatedField: FormFieldState,
    formRules: FormRule[]
): FormState {
    const filteredRulesByFieldId = formRules.filter(rule => rule.fieldId === updatedField.id);

    if (filteredRulesByFieldId.length === 0) {
        return currentFormState;
    }

    const formStateWithRulesApplied = filteredRulesByFieldId.reduce((formState, rule) => {
        switch (rule.type) {
            case "requiredFieldsByFieldValue":
                return {
                    ...formState,
                    sections: formState.sections.map(section =>
                        setRequiredFieldsByFieldValueInSection(section, updatedField.value, rule)
                    ),
                };
        }
    }, currentFormState);

    return formStateWithRulesApplied;
}
