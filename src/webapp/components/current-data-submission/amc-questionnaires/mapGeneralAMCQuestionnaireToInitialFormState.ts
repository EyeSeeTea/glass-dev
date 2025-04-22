import { AMCQuestionnaireQuestions } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { GeneralAMCQuestionId } from "../../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { getBooleanFromYesNoValue } from "../../../../domain/entities/amc-questionnaires/YesNoOption";
import i18n from "../../../../locales";
import { AMCQuestionnaireOptionsContextState } from "../../../contexts/amc-questionnaire-options-context";
import { getFieldIdFromIdsDictionary } from "../../form/presentation-entities/FormFieldsState";
import { FormState } from "../../form/presentation-entities/FormState";
import { mapToFormOptions } from "./mapEntityToFormState";
import { GeneralAMCQuestionnaireFormEntity } from "./presentation-entities/QuestionnaireFormEntity";

export const generalAMCQuestionnaireFieldIds = {
    sameAsLastYear: "sameAsLastYear",
    shortageInPublicSector: "shortageInPublicSector",
    detailOnShortageInPublicSector: "detailOnShortageInPublicSector",
    shortageInPrivateSector: "shortageInPrivateSector",
    detailOnShortageInPrivateSector: "detailOnShortageInPrivateSector",
    generalComments: "generalComments",
    antibacterials: "antibacterials",
    antifungals: "antifungals",
    antivirals: "antivirals",
    antituberculosis: "antituberculosis",
    antimalaria: "antimalaria",
} as const;

export function mapGeneralAMCQuestionnaireToInitialFormState(params: {
    questionnaireFormEntity: GeneralAMCQuestionnaireFormEntity;
    editMode: boolean;
    options: AMCQuestionnaireOptionsContextState;
}): FormState {
    const { questionnaireFormEntity, options } = params;

    const fromIdsDictionary = (key: keyof typeof generalAMCQuestionnaireFieldIds) =>
        getFieldIdFromIdsDictionary(key, generalAMCQuestionnaireFieldIds);

    const fromQuestions = (id: GeneralAMCQuestionId) => getQuestionById(id, questionnaireFormEntity.questions);

    return {
        id: questionnaireFormEntity?.entity?.id || "",
        title: "General questionnaire",
        isValid: false,
        sections: [
            {
                title: "General questionnaire",
                id: "general_section",
                isVisible: true,
                required: true,
                fields: [
                    {
                        id: fromIdsDictionary("sameAsLastYear"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        value: questionnaireFormEntity?.entity?.isSameAsLastYear || "",
                        options: mapToFormOptions(options.yesNoUnknownNAOptions),
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("isSameAsLastYear"),
                    },
                ],
            },
            {
                title: "Public sector",
                id: "public_sector_section",
                isVisible: true,
                required: true,
                fields: [
                    {
                        id: fromIdsDictionary("shortageInPublicSector"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        options: mapToFormOptions(options.yesNoUnknownOptions),
                        value: questionnaireFormEntity?.entity?.shortageInPublicSector || "",
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("shortageInPublicSector"),
                    },
                    {
                        id: fromIdsDictionary("detailOnShortageInPublicSector"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.detailOnShortageInPublicSector || "",
                        multiline: false,
                        required: false,
                        text: fromQuestions("detailOnShortageInPublicSector"),
                    },
                ],
            },
            {
                title: "Private sector",
                id: "private_sector_section",
                isVisible: true,
                required: true,
                fields: [
                    {
                        id: fromIdsDictionary("shortageInPrivateSector"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        options: mapToFormOptions(options.yesNoUnknownOptions),
                        value: questionnaireFormEntity?.entity?.shortageInPrivateSector || "",
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("shortageInPrivateSector"),
                    },
                    {
                        id: fromIdsDictionary("detailOnShortageInPrivateSector"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.detailOnShortageInPrivateSector || "",
                        multiline: false,
                        required: false,
                        text: fromQuestions("detailOnShortageInPrivateSector"),
                    },
                ],
            },
            {
                title: "General comments",
                id: "general_comments_section",
                isVisible: true,
                required: true,
                fields: [
                    {
                        id: fromIdsDictionary("generalComments"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.generalComments || "",
                        multiline: false,
                        required: false,
                        text: fromQuestions("generalComments"),
                    },
                ],
            },
            {
                title: "AM class",
                id: "am_class_section",
                isVisible: true,
                required: true,
                fields: [
                    {
                        id: fromIdsDictionary("antibacterials"),
                        isVisible: true,
                        errors: [],
                        type: "boolean",
                        label: i18n.t("Yes"),
                        value:
                            getBooleanFromYesNoValue(questionnaireFormEntity?.entity?.antibacterials || "0") || false,
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("antibacterials"),
                    },
                    {
                        id: fromIdsDictionary("antifungals"),
                        isVisible: true,
                        errors: [],
                        type: "boolean",
                        label: i18n.t("Yes"),
                        value: getBooleanFromYesNoValue(questionnaireFormEntity?.entity?.antifungals || "0") || false,
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("antifungals"),
                    },
                    {
                        id: fromIdsDictionary("antivirals"),
                        isVisible: true,
                        errors: [],
                        type: "boolean",
                        label: i18n.t("Yes"),
                        value: getBooleanFromYesNoValue(questionnaireFormEntity?.entity?.antivirals || "0") || false,
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("antivirals"),
                    },
                    {
                        id: fromIdsDictionary("antituberculosis"),
                        isVisible: true,
                        errors: [],
                        type: "boolean",
                        label: i18n.t("Yes"),
                        value:
                            getBooleanFromYesNoValue(questionnaireFormEntity?.entity?.antituberculosis || "0") || false,
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("antituberculosis"),
                    },
                    {
                        id: fromIdsDictionary("antimalaria"),
                        isVisible: true,
                        errors: [],
                        type: "boolean",
                        label: i18n.t("Yes"),
                        value: getBooleanFromYesNoValue(questionnaireFormEntity?.entity?.antimalaria || "0") || false,
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("antimalaria"),
                    },
                ],
            },
        ],
    };
}

function getQuestionById(id: GeneralAMCQuestionId, questions: AMCQuestionnaireQuestions): string {
    return questions.find(question => question.id === id)?.text || "";
}
