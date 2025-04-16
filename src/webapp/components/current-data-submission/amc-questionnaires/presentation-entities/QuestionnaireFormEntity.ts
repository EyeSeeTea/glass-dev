import { GeneralAMCQuestionnaire } from "../../../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { Maybe } from "../../../../../utils/ts-utils";
import { AMCQuestionnaireFormType } from "./AMCQuestionnaireFormType";
import { FormRule } from "../../../form/presentation-entities/FormRule";

export type FormLables = {
    errors: Record<string, string>;
};

type BaseFormData = {
    labels: FormLables;
    rules: FormRule[];
    type: AMCQuestionnaireFormType;
};

export type GeneralAMCQuestionnaireFormEntity = BaseFormData & {
    type: "general-questionnaire";
    entity: Maybe<GeneralAMCQuestionnaire>;
};

export type QuestionnaireFormEntity = GeneralAMCQuestionnaireFormEntity;

export function getQuestionnaireFormEntity(
    type: QuestionnaireFormEntity["type"],
    entity?: QuestionnaireFormEntity["entity"]
): QuestionnaireFormEntity {
    // TODO: when more questionnaire types are added, add them here with switch case
    return getGeneralAMCQuestionnaireFormEntity(entity);
}

function getGeneralAMCQuestionnaireFormEntity(
    entity?: Maybe<GeneralAMCQuestionnaire>
): GeneralAMCQuestionnaireFormEntity {
    const { rules, labels } = getGeneralAMCQuestionnaireFormLabelsRules();

    return {
        type: "general-questionnaire",
        entity: entity,
        rules: rules,
        labels: labels,
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
            // {
            //     type: "mandatoryFieldsByFieldValue";
            //     fieldId: string;
            //     fieldValue: string | boolean | string[] | Date | Maybe<string> | null;
            //     mandatoryFieldIds: string[];
            //     sectionIdsWithMandatoryFields: string[];
            // }
        ],
    };
}
