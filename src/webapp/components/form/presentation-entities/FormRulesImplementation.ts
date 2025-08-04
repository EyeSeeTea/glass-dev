import { ValidationErrorKey } from "../../../../domain/entities/amc-questionnaires/ValidationError";
import { replaceById } from "../../../../utils/ts-utils";
import { FormFieldState } from "./FormFieldsState";
import { FormRule } from "./FormRule";
import { FormSectionState, getFieldValueByIdFromSections } from "./FormSectionsState";
import { FormState } from "./FormState";

export type FormRuleExecEvent = "change" | "load";

export type FormRuleExecOptions<ContextType extends object> = {
    formState: FormState;
    rule: FormRule<ContextType>;
    section: FormSectionState;
    triggerField: FormFieldState;
    event: FormRuleExecEvent;
    context?: ContextType;
};

type FormRulesImplementationMap<ContextType extends object> = Record<
    FormRule<ContextType>["type"],
    (options: FormRuleExecOptions<ContextType>) => FormSectionState
>;

function getFormRulesImplementations<ContextType extends object>(): FormRulesImplementationMap<ContextType> {
    return {
        requiredFieldsByFieldValue: setRequiredFieldsByFieldValueInSection,
        requiredFieldsByCustomCondition: setRequiredFieldsByFieldsConditionInSection,
        disableOptionsByFieldValues: setDisabledOptionsByFieldValues,
        overrideFieldsOnChange: setOverrideFieldsByFieldValue,
        toggleVisibilityByFieldValue: setVisibleFieldsByFieldValue,
    } as FormRulesImplementationMap<ContextType>;
}

export function getFormRuleImplementation<ContextType extends object>(
    ruleType: FormRule<ContextType>["type"]
): (options: FormRuleExecOptions<ContextType>) => FormSectionState {
    const implementation = getFormRulesImplementations<ContextType>()[ruleType];
    return implementation;
}

export function setRequiredFieldsByFieldValueInSection<ContextType extends object>(
    options: FormRuleExecOptions<ContextType>
): FormSectionState {
    const { section, rule, triggerField } = options;
    const fieldValue = triggerField.value;

    if (rule.type !== "requiredFieldsByFieldValue") return section;

    if (rule.sectionIdsWithRequiredFields.includes(section.id)) {
        const fieldsInSection: FormFieldState[] = section.fields.map(field => {
            return rule.requiredFieldIds.includes(field.id)
                ? {
                      ...field,
                      required: fieldValue === rule.fieldValue,
                      errors:
                          fieldValue !== rule.fieldValue
                              ? field.errors.filter(error => error !== ValidationErrorKey.FIELD_IS_REQUIRED)
                              : field.errors,
                  }
                : field;
        });

        return {
            ...section,
            fields: fieldsInSection,
        };
    } else {
        return {
            ...section,
        };
    }
}

export function setRequiredFieldsByFieldsConditionInSection<ContextType extends object>(
    options: FormRuleExecOptions<ContextType>
): FormSectionState {
    const { section, formState, rule } = options;
    if (rule.type !== "requiredFieldsByCustomCondition") return section;

    const fieldValues = rule.fieldIds.reduce((acc: Record<string, FormFieldState["value"]>, fieldId) => {
        const fieldValue = getFieldValueByIdFromSections(formState.sections, fieldId);
        if (fieldValue === undefined) {
            console.warn(`setRequiredFieldsByFieldsConditionInSection: Field with id ${fieldId} not found in sections`);
            return acc;
        }
        return {
            ...acc,
            [fieldId]: fieldValue,
        };
    }, {});

    if (rule.sectionIdsWithRequiredFields.includes(section.id)) {
        const fieldsInSection: FormFieldState[] = section.fields.map(field => {
            return rule.requiredFieldIds.includes(field.id)
                ? {
                      ...field,
                      required: rule.condition(fieldValues),
                      errors: !rule.condition(fieldValues)
                          ? field.errors.filter(error => error !== ValidationErrorKey.FIELD_IS_REQUIRED)
                          : field.errors,
                  }
                : field;
        });

        return {
            ...section,
            fields: fieldsInSection,
        };
    } else {
        return {
            ...section,
        };
    }
}

export function setVisibleFieldsByFieldValue<ContextType extends object>(
    options: FormRuleExecOptions<ContextType>
): FormSectionState {
    const { section, rule, triggerField } = options;
    if (rule.type !== "toggleVisibilityByFieldValue") return section;

    const fieldValue = triggerField.value;
    const shouldShow = rule.showCondition(fieldValue);
    const fieldsInSection: FormFieldState[] = section.fields.map(field => {
        return rule.fieldIdsToToggle.includes(field.id) ? { ...field, isVisible: shouldShow } : field;
    });

    return {
        ...section,
        fields: fieldsInSection,
    };
}

export function setDisabledOptionsByFieldValues<ContextType extends object>(
    options: FormRuleExecOptions<ContextType>
): FormSectionState {
    const { section, rule } = options;
    if (rule.type !== "disableOptionsByFieldValues") return section;
    const field = section.fields.find(field => field.id === rule.fieldId);
    if (!field) {
        return section; // No field with the specified ID in this section
    }
    if (!("options" in field)) {
        console.warn(`setDisabledOptionsByFieldValues: Field with id ${rule.fieldId} has no options`);
        return section;
    }
    const disabledOptions = rule.disableCondition(Array.isArray(field.value) ? field.value : [field.value]);
    const updatedField: FormFieldState = {
        ...field,
        options: field.options.map(option => ({
            ...option,
            disabled: disabledOptions.includes(option.value),
        })),
    };
    return {
        ...section,
        fields: replaceById(section.fields, updatedField),
    };
}

export function setOverrideFieldsByFieldValue<ContextType extends object>(
    options: FormRuleExecOptions<ContextType>
): FormSectionState {
    const { section, formState, rule, event, context } = options;
    if (rule.type !== "overrideFieldsOnChange") return section;
    if (!rule.triggerOnLoad && event === "load") return section;
    const fieldValue = getFieldValueByIdFromSections(formState.sections, rule.fieldId);
    if (fieldValue === undefined) {
        console.warn(`setOverrideFieldsByFieldValue: Field with id ${rule.fieldId} not found in sections`);
        return section;
    }
    // undefined rule.fieldValue means it should always exec the rule
    if (rule.fieldValue !== undefined && fieldValue !== rule.fieldValue) {
        return section; // No override if value is not matching to target
    }
    const overrideFields = rule.overrideFieldsCallback(formState, context);

    const fieldsInSection: FormFieldState[] = section.fields.map(field => {
        const overrideField = overrideFields.find(override => override.id === field.id);
        return overrideField ? ({ ...field, ...overrideField } as FormFieldState) : field;
    });

    return {
        ...section,
        fields: fieldsInSection,
    };
}
