import { AMClassAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { AMCQuestionnaireQuestions } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { Maybe } from "../../../../utils/ts-utils";
import { FormRule } from "../../form/presentation-entities/FormRule";
import { AMClassAMCQuestionnaireFormEntity, FormLables } from "./presentation-entities/QuestionnaireFormEntity";

export function getAMClassAMCQuestionnaireFormEntity(
    amcQuestions: AMCQuestionnaireQuestions,
    entity?: Maybe<AMClassAMCQuestionnaire>
): AMClassAMCQuestionnaireFormEntity {
    const { rules, labels } = getAMClassAMCQuestionnaireFormLabelsRules();

    return {
        type: "am-class-questionnaire",
        entity: entity,
        rules: rules,
        labels: labels,
        questions: amcQuestions,
    };
}

function getAMClassAMCQuestionnaireFormLabelsRules(): { rules: FormRule[]; labels: FormLables } {
    return {
        labels: {
            errors: {
                field_is_required: "This field is required",
            },
        },
        rules: [
            {
                type: "requiredFieldsByCustomCondition",
                fieldIds: ["stratas"],
                condition: fields =>
                    !!AMClassAMCQuestionnaire.requiredFieldsCustomConditions(fields)["estVolumeTotalHealthLevel"],
                requiredFieldIds: ["estVolumeTotalHealthLevel"],
                sectionIdsWithRequiredFields: ["general_section"],
            },
            {
                type: "requiredFieldsByCustomCondition",
                fieldIds: ["stratas"],
                condition: fields =>
                    !!AMClassAMCQuestionnaire.requiredFieldsCustomConditions(fields)["estVolumeHospitalHealthLevel"],
                requiredFieldIds: ["estVolumeHospitalHealthLevel"],
                sectionIdsWithRequiredFields: ["general_section"],
            },
            {
                type: "requiredFieldsByCustomCondition",
                fieldIds: ["stratas"],
                condition: fields =>
                    !!AMClassAMCQuestionnaire.requiredFieldsCustomConditions(fields)["estVolumeCommunityHealthLevel"],
                requiredFieldIds: ["estVolumeCommunityHealthLevel"],
                sectionIdsWithRequiredFields: ["general_section"],
            },
        ],
    };
}
