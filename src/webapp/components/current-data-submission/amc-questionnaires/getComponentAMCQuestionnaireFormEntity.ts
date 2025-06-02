import { AMCQuestionnaireQuestions } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { ComponentAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";
import { DataLevelValues } from "../../../../domain/entities/amc-questionnaires/DataLevelOption";
import { NationalPopulationDataSourceValues } from "../../../../domain/entities/amc-questionnaires/NationalPopulationDataSourceOption";
import { YesNoUnknownValues } from "../../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import { Maybe } from "../../../../utils/ts-utils";
import { FormRule } from "../../form/presentation-entities/FormRule";
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
        ],
    };
}
