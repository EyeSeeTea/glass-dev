import { AMCQuestionnaireQuestions } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { ComponentAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";
import { DataLevelValues } from "../../../../domain/entities/amc-questionnaires/DataLevelOption";
import { NationalPopulationDataSourceValues } from "../../../../domain/entities/amc-questionnaires/NationalPopulationDataSourceOption";
import { YesNoUnknownValues } from "../../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import { Maybe } from "../../../../utils/ts-utils";
import { FormMultipleOptionsFieldState } from "../../form/presentation-entities/FormFieldsState";
import { FormRule, OverrideFieldsByFieldValue } from "../../form/presentation-entities/FormRule";
import { getFieldByIdFromSections } from "../../form/presentation-entities/FormSectionsState";
import { FormState } from "../../form/presentation-entities/FormState";
import { ComponentAMCQuestionnaireStratumFieldIds } from "./mappers/componentAMCQuestionnaireMapper";
import { ComponentAMCQuestionnaireFormEntity, FormLables } from "./presentation-entities/QuestionnaireFormEntity";

export function getComponentAMCQuestionnaireFormEntity(
    amcQuestions: AMCQuestionnaireQuestions,
    entity?: Maybe<ComponentAMCQuestionnaire>
): ComponentAMCQuestionnaireFormEntity {
    const { rules, labels } = getComponentAMCQuestionnaireFormLabelsRules();

    return {
        type: "component-questionnaire",
        entity: entity,
        rules: rules,
        labels: labels,
        questions: amcQuestions,
    };
}

function getStratumFieldValueOverrides(
    valueCallback: (field: FormMultipleOptionsFieldState) => Partial<FormMultipleOptionsFieldState>
): OverrideFieldsByFieldValue["overrideFieldsCallback"] {
    return function (formState: FormState): ReturnType<OverrideFieldsByFieldValue["overrideFieldsCallback"]> {
        const stratumFields = Object.keys(ComponentAMCQuestionnaireStratumFieldIds);
        const fieldsToOverride = stratumFields.map(stratum => {
            const field = getFieldByIdFromSections(formState.sections, stratum);
            if (
                !field ||
                field.type !== "select" ||
                !("options" in field) ||
                !Array.isArray(field.value) ||
                !field.multiple
            ) {
                return null;
            }
            const overrides = valueCallback(field);
            return {
                id: field.id,
                ...overrides,
            };
        });
        return _.compact(fieldsToOverride);
    };
}

function getComponentAMCQuestionnaireFormLabelsRules(): { rules: FormRule[]; labels: FormLables } {
    return {
        labels: {
            errors: {
                field_is_required: "This field is required",
            },
        },
        rules: [
            {
                type: "requiredFieldsByFieldValue",
                fieldId: "excludedSubstances",
                fieldValue: YesNoUnknownValues.YES,
                requiredFieldIds: ["listOfExcludedSubstances"],
                sectionIdsWithRequiredFields: ["component_section"],
            },
            {
                type: "requiredFieldsByFieldValue",
                fieldId: "typeOfDataReported",
                fieldValue: DataLevelValues.Procurement,
                requiredFieldIds: ["procurementTypeOfDataReported"],
                sectionIdsWithRequiredFields: ["component_section"],
            },
            {
                type: "requiredFieldsByFieldValue",
                fieldId: "typeOfDataReported",
                fieldValue: DataLevelValues.Mixed,
                requiredFieldIds: ["mixedTypeOfData"],
                sectionIdsWithRequiredFields: ["component_section"],
            },
            {
                type: "requiredFieldsByFieldValue",
                fieldId: "sameAsUNPopulation",
                fieldValue: false, // checkboxes return booleans instead of YesNoValue
                requiredFieldIds: ["sourceOfNationalPopulation"],
                sectionIdsWithRequiredFields: ["component_section"],
            },
            {
                type: "requiredFieldsByFieldValue",
                fieldId: "sourceOfNationalPopulation",
                fieldValue: NationalPopulationDataSourceValues.Other,
                requiredFieldIds: ["otherSourceForNationalPopulation"],
                sectionIdsWithRequiredFields: ["component_section"],
            },
            {
                type: "overrideFieldsOnChange",
                fieldId: "select-all-amclass-stratum",
                fieldValue: true,
                overrideFieldsCallback: getStratumFieldValueOverrides(field => ({
                    // select all available options
                    value: field.options.map(option => option.value),
                    disabled: true,
                })),
                triggerOnLoad: false,
            },
            {
                type: "overrideFieldsOnChange",
                fieldId: "select-all-amclass-stratum",
                fieldValue: false,
                overrideFieldsCallback: getStratumFieldValueOverrides(() => ({
                    // clear all the values
                    value: [],
                    disabled: false,
                })),
                triggerOnLoad: false,
            },
        ],
    };
}
