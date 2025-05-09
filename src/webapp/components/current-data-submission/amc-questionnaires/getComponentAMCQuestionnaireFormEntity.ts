import { AMCQuestionnaireQuestions } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { ComponentAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";
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
        // TODO: Add rules for component questionnaire
        rules: [],
    };
}
