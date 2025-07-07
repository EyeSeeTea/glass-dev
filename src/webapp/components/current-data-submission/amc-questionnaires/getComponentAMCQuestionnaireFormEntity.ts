import i18n from "@eyeseetea/d2-ui-components/locales";
import { AMCQuestionnaireQuestions } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { ComponentAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";
import { DataLevelValues } from "../../../../domain/entities/amc-questionnaires/DataLevelOption";
import { NationalPopulationDataSourceValues } from "../../../../domain/entities/amc-questionnaires/NationalPopulationDataSourceOption";
import { UNPopulation } from "../../../../domain/entities/amc-questionnaires/UNPopulation";
import { YesNoUnknownValues } from "../../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import { Maybe } from "../../../../utils/ts-utils";
import { FormMultipleOptionsFieldState } from "../../form/presentation-entities/FormFieldsState";
import { FormRule, OverrideFieldsByFieldValue } from "../../form/presentation-entities/FormRule";
import { getFieldByIdFromSections } from "../../form/presentation-entities/FormSectionsState";
import { FormState } from "../../form/presentation-entities/FormState";
import { ComponentAMCQuestionnaireStratumFieldIds } from "./mappers/componentAMCQuestionnaireMapper";
import { ComponentAMCQuestionnaireFormEntity, FormLables } from "./presentation-entities/QuestionnaireFormEntity";

export type ComponentAMCQuestionnaireRulesContext = {
    unPopulation?: UNPopulation;
};

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
): OverrideFieldsByFieldValue<ComponentAMCQuestionnaireRulesContext>["overrideFieldsCallback"] {
    return function (
        formState: FormState
    ): ReturnType<OverrideFieldsByFieldValue<ComponentAMCQuestionnaireRulesContext>["overrideFieldsCallback"]> {
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

function toggleUnPopulationField(
    visible: boolean
): OverrideFieldsByFieldValue<ComponentAMCQuestionnaireRulesContext>["overrideFieldsCallback"] {
    return function (
        formState: FormState,
        context?: ComponentAMCQuestionnaireRulesContext
    ): ReturnType<OverrideFieldsByFieldValue<ComponentAMCQuestionnaireRulesContext>["overrideFieldsCallback"]> {
        const unPopulationField = getFieldByIdFromSections(formState.sections, "unPopulation");
        if (!unPopulationField || unPopulationField.type !== "text") {
            return [];
        }
        const valueFromDataSet = context?.unPopulation?.population?.toString() ?? "";
        // do not override the value if it is already set
        const useValueFromDataSet = visible && !unPopulationField.value;
        return [
            {
                id: unPopulationField.id,
                isVisible: visible,
                value: useValueFromDataSet ? valueFromDataSet : unPopulationField.value,
                helperText: !visible
                    ? undefined
                    : useValueFromDataSet
                    ? valueFromDataSet
                        ? i18n.t("Population value loaded from Population UN DataSet")
                        : i18n.t("Population value could not be loaded from Population UN DataSet")
                    : undefined,
            },
        ];
    };
}

function getComponentAMCQuestionnaireFormLabelsRules(): {
    rules: FormRule<ComponentAMCQuestionnaireRulesContext>[];
    labels: FormLables;
} {
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
            {
                type: "overrideFieldsOnChange",
                fieldId: "sameAsUNPopulation",
                fieldValue: true,
                overrideFieldsCallback: toggleUnPopulationField(true),
                triggerOnLoad: false,
            },
            {
                type: "overrideFieldsOnChange",
                fieldId: "sameAsUNPopulation",
                fieldValue: false,
                overrideFieldsCallback: toggleUnPopulationField(false),
                triggerOnLoad: false,
            },
        ],
    };
}
