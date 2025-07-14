import { AMCQuestionnaireQuestions } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { ComponentAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";
import { DataLevelValues } from "../../../../domain/entities/amc-questionnaires/DataLevelOption";
import { UNPopulation } from "../../../../domain/entities/amc-questionnaires/UNPopulation";
import { YesNoValues } from "../../../../domain/entities/amc-questionnaires/YesNoOption";
import { YesNoUnknownValues } from "../../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import { Maybe } from "../../../../utils/ts-utils";
import { FormMultipleOptionsFieldState } from "../../form/presentation-entities/FormFieldsState";
import { FormRule, OverrideFieldsCallback } from "../../form/presentation-entities/FormRule";
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
): OverrideFieldsCallback<ComponentAMCQuestionnaireRulesContext> {
    return function (formState: FormState): ReturnType<OverrideFieldsCallback<ComponentAMCQuestionnaireRulesContext>> {
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

function calculateUnPopulationCoverage(
    formState: FormState
): ReturnType<OverrideFieldsCallback<ComponentAMCQuestionnaireRulesContext>> {
    const fields = {
        sameAsUNPopulation: getFieldByIdFromSections(formState.sections, "sameAsUNPopulation"),
        unPopulation: getFieldByIdFromSections(formState.sections, "unPopulation"),
        populationCovered: getFieldByIdFromSections(formState.sections, "populationCovered"),
        unPopulationCoverage: getFieldByIdFromSections(formState.sections, "unPopulationCoverage"),
    };
    if (
        !fields.sameAsUNPopulation ||
        !fields.unPopulation ||
        !fields.populationCovered ||
        !fields.unPopulationCoverage
    ) {
        console.warn("calculateUnPopulationCoverage: Required fields are missing");
        return [];
    }
    if (fields.sameAsUNPopulation.value === YesNoValues.YES) {
        return [{ id: fields.unPopulationCoverage.id, value: "100" }];
    } else {
        const populationCoveredValue = fields.populationCovered.value;
        const populationUnValue = fields.unPopulation.value;
        if (
            !populationCoveredValue ||
            !populationUnValue ||
            typeof populationCoveredValue !== "string" ||
            typeof populationUnValue !== "string"
        ) {
            return [{ id: fields.unPopulationCoverage.id, value: "" }];
        }
        const result = (parseFloat(populationCoveredValue) / parseFloat(populationUnValue)) * 100;
        return [
            {
                id: fields.unPopulationCoverage.id,
                value: isNaN(result) ? "" : result.toFixed(2),
            },
        ];
    }
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
                fieldValue: YesNoValues.NO,
                requiredFieldIds: ["sourceOfNationalPopulation"],
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
                type: "toggleVisibilityByFieldValue",
                fieldId: "sameAsUNPopulation",
                showCondition: fieldValue => fieldValue === YesNoValues.NO,
                fieldIdsToToggle: ["populationCovered", "sourceOfNationalPopulation", "nationalCoverage"],
            },
            {
                type: "overrideFieldsOnChange",
                fieldId: "sameAsUNPopulation",
                overrideFieldsCallback: calculateUnPopulationCoverage,
                triggerOnLoad: false,
            },
            {
                type: "overrideFieldsOnChange",
                fieldId: "unPopulation",
                overrideFieldsCallback: calculateUnPopulationCoverage,
                triggerOnLoad: false,
            },
            {
                type: "overrideFieldsOnChange",
                fieldId: "populationCovered",
                overrideFieldsCallback: calculateUnPopulationCoverage,
                triggerOnLoad: false,
            },
        ],
    };
}
