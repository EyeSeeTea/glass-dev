import { AMCQuestionnaireQuestions } from "../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { GeneralAMCQuestionId } from "../../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { getBooleanFromYesNoValue } from "../../../../domain/entities/amc-questionnaires/YesNoOption";
import { YesNoUnknownValues } from "../../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
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
    isViewOnlyMode?: boolean;
}): FormState {
    const { questionnaireFormEntity, options, isViewOnlyMode } = params;

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
                        disabled: isViewOnlyMode,
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
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("detailOnShortageInPublicSector"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.detailOnShortageInPublicSector || "",
                        multiline: false,
                        required: YesNoUnknownValues.YES === questionnaireFormEntity?.entity?.shortageInPublicSector,
                        text: fromQuestions("detailOnShortageInPublicSector"),
                        disabled: isViewOnlyMode,
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
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("detailOnShortageInPrivateSector"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.detailOnShortageInPrivateSector || "",
                        multiline: false,
                        required: YesNoUnknownValues.YES === questionnaireFormEntity?.entity?.shortageInPrivateSector,
                        text: fromQuestions("detailOnShortageInPrivateSector"),
                        disabled: isViewOnlyMode,
                    },
                ],
            },
            {
                title: "General comments",
                id: "general_comments_section",
                isVisible: true,
                required: false,
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
                        disabled: isViewOnlyMode,
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
                        disabled: isViewOnlyMode,
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
                        disabled: isViewOnlyMode,
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
                        disabled: isViewOnlyMode,
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
                        disabled: isViewOnlyMode,
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
                        disabled: isViewOnlyMode,
                    },
                ],
            },
        ],
    };
}

function getQuestionById(id: GeneralAMCQuestionId, questions: AMCQuestionnaireQuestions): string {
    return questions.find(question => question.id === id)?.text || "";
}
