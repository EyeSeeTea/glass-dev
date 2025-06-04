import { AMClassAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { AMCQuestionnaireQuestions } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { getDisabledStratas, strataOption } from "../../../../domain/entities/amc-questionnaires/StrataOption";
import { Maybe } from "../../../../utils/ts-utils";
import { FormRule } from "../../form/presentation-entities/FormRule";
import { AMClassAMCQuestionnaireFormEntity, FormLables } from "./presentation-entities/QuestionnaireFormEntity";
import _ from "lodash";

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
                type: "disableOptionsByFieldValues",
                fieldId: "stratas",
                disableCondition: selectedValues => {
                    const selectedStratas = _.compact(selectedValues.map(code => strataOption.getSafeValue(code)));
                    return getDisabledStratas(selectedStratas);
                },
            },
        ],
    };
}
