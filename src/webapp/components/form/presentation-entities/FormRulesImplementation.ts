import { ValidationErrorKey } from "../../../../domain/entities/amc-questionnaires/ValidationError";
import { replaceById } from "../../../../utils/ts-utils";
import { FormFieldState } from "./FormFieldsState";
import { FormRule } from "./FormRule";
import { FormSectionState, getFieldValueByIdFromSections } from "./FormSectionsState";
import { FormState } from "./FormState";

export type FormRuleExecEvent = "change" | "load";

export type FormRuleExecOptions = {
    formState: FormState;
    rule: FormRule;
    section: FormSectionState;
    triggerField: FormFieldState;
    event: FormRuleExecEvent;
};

export const FormRulesImplementation: Record<FormRule["type"], (options: FormRuleExecOptions) => FormSectionState> = {
    requiredFieldsByFieldValue: setRequiredFieldsByFieldValueInSection,
    requiredFieldsByCustomCondition: setRequiredFieldsByFieldsConditionInSection,
    disableOptionsByFieldValues: setDisabledOptionsByFieldValues,
    overrideFieldsOnChange: setOverrideFieldsByFieldValue,
} as const;

export function setRequiredFieldsByFieldValueInSection(options: FormRuleExecOptions): FormSectionState {
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

export function setRequiredFieldsByFieldsConditionInSection(options: FormRuleExecOptions): FormSectionState {
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

export function setDisabledOptionsByFieldValues(options: FormRuleExecOptions): FormSectionState {
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

export function setOverrideFieldsByFieldValue(options: FormRuleExecOptions): FormSectionState {
    const { section, formState, rule, event } = options;
    if (rule.type !== "overrideFieldsOnChange") return section;
    if (!rule.triggerOnLoad && event === "load") return section;
    const fieldValue = getFieldValueByIdFromSections(formState.sections, rule.fieldId);
    if (fieldValue === undefined) {
        console.warn(`setOverrideFieldsByFieldValue: Field with id ${rule.fieldId} not found in sections`);
        return section;
    }
    if (fieldValue !== rule.fieldValue) {
        return section; // No override if value is not matching to target
    }
    const overrideFields = rule.overrideFieldsCallback(formState);

    const fieldsInSection: FormFieldState[] = section.fields.map(field => {
        const overrideField = overrideFields.find(override => override.id === field.id);
        return overrideField ? ({ ...field, ...overrideField } as FormFieldState) : field;
    });

    return {
        ...section,
        fields: fieldsInSection,
    };
}
