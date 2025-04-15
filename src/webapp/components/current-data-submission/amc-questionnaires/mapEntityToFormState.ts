import { getFieldIdFromIdsDictionary } from "../../form/presentation-entities/FormFieldsState";
import { FormState } from "../../form/presentation-entities/FormState";
import {
    GeneralAMCQuestionnaireFormEntity,
    QuestionnaireFormEntity,
} from "./presentation-entities/QuestionnaireFormEntity";

export function mapEntityToFormState(options: {
    questionnaireFormEntity: QuestionnaireFormEntity;
    editMode?: boolean;
}): FormState {
    const { questionnaireFormEntity, editMode = false } = options;
    // TODO: when more questionnaire types are added, add them here with switch case
    return mapGeneralAMCQuestionnaireToInitialFormState({
        questionnaireFormEntity: questionnaireFormEntity,
        editMode,
    });
}

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

function mapGeneralAMCQuestionnaireToInitialFormState(options: {
    questionnaireFormEntity: GeneralAMCQuestionnaireFormEntity;
    editMode: boolean;
}): FormState {
    const { questionnaireFormEntity } = options;

    const fromIdsDictionary = (key: keyof typeof generalAMCQuestionnaireFieldIds) =>
        getFieldIdFromIdsDictionary(key, generalAMCQuestionnaireFieldIds);

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
                        type: "text",
                        value: questionnaireFormEntity?.entity?.isSameAsLastYear || "",
                        multiline: false,
                        required: true,
                        showIsRequired: false,
                        text: "Is the data the same as last year?",
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
                        type: "text",
                        value: questionnaireFormEntity?.entity?.shortageInPublicSector || "",
                        multiline: false,
                        required: true,
                        showIsRequired: false,
                        text: "Is there a shortage in the public sector?",
                    },
                    {
                        id: fromIdsDictionary("detailOnShortageInPublicSector"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.detailOnShortageInPublicSector || "",
                        multiline: false,
                        required: false,
                        showIsRequired: false,
                        text: "Please provide details on the shortage in the public sector",
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
                        type: "text",
                        value: questionnaireFormEntity?.entity?.shortageInPrivateSector || "",
                        multiline: false,
                        required: true,
                        showIsRequired: false,
                        text: "Is there a shortage in the private sector?",
                    },
                    {
                        id: fromIdsDictionary("detailOnShortageInPrivateSector"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.detailOnShortageInPrivateSector || "",
                        multiline: false,
                        required: false,
                        showIsRequired: false,
                        text: "Please provide details on the shortage in the private sector",
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
                        multiline: true,
                        required: false,
                        showIsRequired: false,
                        text: "General comments",
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
                        type: "text",
                        value: questionnaireFormEntity?.entity?.antibacterials || "",
                        multiline: true,
                        required: true,
                        showIsRequired: false,
                        text: "Antibacterials",
                    },
                    {
                        id: fromIdsDictionary("antifungals"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.antifungals || "",
                        multiline: true,
                        required: true,
                        showIsRequired: false,
                        text: "Antifungals",
                    },
                    {
                        id: fromIdsDictionary("antivirals"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.antivirals || "",
                        multiline: true,
                        required: true,
                        showIsRequired: false,
                        text: "Antivirals",
                    },
                    {
                        id: fromIdsDictionary("antituberculosis"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.antituberculosis || "",
                        multiline: true,
                        required: true,
                        showIsRequired: false,
                        text: "Antituberculosis",
                    },
                    {
                        id: fromIdsDictionary("antimalaria"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.antimalaria || "",
                        multiline: true,
                        required: true,
                        showIsRequired: false,
                        text: "Antimalaria",
                    },
                ],
            },
        ],
    };
}
