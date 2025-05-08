import { AMCQuestionnaireQuestions } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { GeneralAMCQuestionnaire } from "../../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { YesNoUnknownValues } from "../../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import { Maybe } from "../../../../utils/ts-utils";
import { FormRule } from "../../form/presentation-entities/FormRule";
import { GeneralAMCQuestionnaireFormEntity, FormLables } from "./presentation-entities/QuestionnaireFormEntity";

export function getGeneralAMCQuestionnaireFormEntity(
    amcQuestions: AMCQuestionnaireQuestions,
    entity?: Maybe<GeneralAMCQuestionnaire>
): GeneralAMCQuestionnaireFormEntity {
    const { rules, labels } = getGeneralAMCQuestionnaireFormLabelsRules();

    return {
        type: "general-questionnaire",
        entity: entity,
        rules: rules,
        labels: labels,
        questions: amcQuestions,
    };
}

function getGeneralAMCQuestionnaireFormLabelsRules(): { rules: FormRule[]; labels: FormLables } {
    return {
        labels: {
            errors: {
                field_is_required: "This field is required",
            },
        },
        rules: [
            {
                type: "requiredFieldsByFieldValue",
                fieldId: "shortageInPublicSector",
                fieldValue: YesNoUnknownValues.YES,
                requiredFieldIds: ["detailOnShortageInPublicSector"],
                sectionIdsWithRequiredFields: ["public_sector_section"],
            },
            {
                type: "requiredFieldsByFieldValue",
                fieldId: "shortageInPrivateSector",
                fieldValue: YesNoUnknownValues.YES,
                requiredFieldIds: ["detailOnShortageInPrivateSector"],
                sectionIdsWithRequiredFields: ["private_sector_section"],
            },
        ],
    };
}
