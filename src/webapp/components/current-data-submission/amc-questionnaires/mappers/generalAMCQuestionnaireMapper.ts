import {
    GeneralAMCQuestionId,
    GeneralAMCQuestionnaire,
    GeneralAMCQuestionnaireAttributes,
    GeneralAMCQuestionnaireBaseAttributes,
} from "../../../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { yesNoOption } from "../../../../../domain/entities/amc-questionnaires/YesNoOption";
import { YesNoUnknownValues } from "../../../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import {
    FormFieldState,
    getAllFieldsFromSections,
    getBooleanFieldValue,
    getFieldIdFromIdsDictionary,
    getStringFieldValue,
} from "../../../form/presentation-entities/FormFieldsState";
import { FormState } from "../../../form/presentation-entities/FormState";
import { GeneralAMCQuestionnaireFormEntity } from "../presentation-entities/QuestionnaireFormEntity";
import { MapToAMCQuestionnaireParams, MapToFormStateParams } from "./mapperTypes";
import { getOptionCodeFromFieldValue, getQuestionTextsByQuestionId, mapToFormOptions } from "./mapperUtils";
import i18n from "../../../../../locales";

export function mapFormStateToGeneralAMCQuestionnaire(
    params: MapToAMCQuestionnaireParams<GeneralAMCQuestionnaireFormEntity>
): GeneralAMCQuestionnaire {
    const { formState, formEntity, options, period, orgUnitId, editMode } = params;
    const baseAttributes = getGeneralAMCQuestionnaireBaseAttributes(formEntity, orgUnitId, period, editMode);

    const allFields: FormFieldState[] = getAllFieldsFromSections(formState.sections);

    const isSameAsLastYear = getOptionCodeFromFieldValue("sameAsLastYear", options.yesNoUnknownNAOptions, allFields);
    const shortageInPublicSector = getOptionCodeFromFieldValue(
        "shortageInPublicSector",
        options.yesNoUnknownOptions,
        allFields
    );
    const detailOnShortageInPublicSector = getStringFieldValue("detailOnShortageInPublicSector", allFields);
    const shortageInPrivateSector = options.yesNoUnknownOptions.find(
        option => option.code === getStringFieldValue("shortageInPrivateSector", allFields)
    )?.code;
    const detailOnShortageInPrivateSector = getStringFieldValue("detailOnShortageInPrivateSector", allFields);
    const generalComments = getStringFieldValue("generalComments", allFields);
    const antibacterials = yesNoOption.getValueFromBoolean(getBooleanFieldValue("antibacterials", allFields));
    const antifungals = yesNoOption.getValueFromBoolean(getBooleanFieldValue("antifungals", allFields));
    const antivirals = yesNoOption.getValueFromBoolean(getBooleanFieldValue("antivirals", allFields));
    const antituberculosis = yesNoOption.getValueFromBoolean(getBooleanFieldValue("antituberculosis", allFields));
    const antimalaria = yesNoOption.getValueFromBoolean(getBooleanFieldValue("antimalaria", allFields));

    if (
        !isSameAsLastYear ||
        !shortageInPublicSector ||
        !shortageInPrivateSector ||
        !antibacterials ||
        !antifungals ||
        !antivirals ||
        !antituberculosis ||
        !antimalaria
    ) {
        throw new Error("Missing required General AMC Questionnaire attributes");
    }

    const generalAMCQuestionnaireAttributes: GeneralAMCQuestionnaireAttributes = {
        ...baseAttributes,
        isSameAsLastYear: isSameAsLastYear,
        shortageInPublicSector: shortageInPublicSector,
        detailOnShortageInPublicSector: detailOnShortageInPublicSector,
        shortageInPrivateSector: shortageInPrivateSector,
        detailOnShortageInPrivateSector: detailOnShortageInPrivateSector,
        generalComments: generalComments,
        antibacterials: antibacterials,
        antifungals: antifungals,
        antivirals: antivirals,
        antituberculosis: antituberculosis,
        antimalaria: antimalaria,
    };

    const generalAMCQuestionnaireValidation = GeneralAMCQuestionnaire.validateAndCreate(
        generalAMCQuestionnaireAttributes
    );
    const validGeneralAMCQuestionnaire = generalAMCQuestionnaireValidation.match({
        error: () => undefined,
        success: generalAMCQuestionnaire => generalAMCQuestionnaire,
    });

    if (!validGeneralAMCQuestionnaire) {
        throw new Error("Invalid General AMC Questionnaire");
    }

    return validGeneralAMCQuestionnaire;
}

function getGeneralAMCQuestionnaireBaseAttributes(
    formEntity: GeneralAMCQuestionnaireFormEntity,
    orgUnitId: string,
    period: string,
    editMode: boolean
): GeneralAMCQuestionnaireBaseAttributes {
    if (editMode) {
        if (!formEntity.entity) {
            throw new Error("Form entity is not defined");
        }
        return {
            id: formEntity.entity.id,
            orgUnitId: formEntity.entity.orgUnitId,
            period: formEntity.entity.period,
            status: formEntity.entity.status,
            created: formEntity.entity.created,
            lastUpdated: new Date(),
        };
    } else {
        return {
            id: "",
            orgUnitId: orgUnitId,
            period: period,
            status: "ACTIVE",
            created: new Date(),
            lastUpdated: new Date(),
        };
    }
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

export function mapGeneralAMCQuestionnaireToInitialFormState(
    params: MapToFormStateParams<GeneralAMCQuestionnaireFormEntity>
): FormState {
    const { questionnaireFormEntity, options, isViewOnlyMode, amcQuestionnaire } = params;

    const fromIdsDictionary = (key: keyof typeof generalAMCQuestionnaireFieldIds) =>
        getFieldIdFromIdsDictionary(key, generalAMCQuestionnaireFieldIds);

    const fromQuestions = (id: GeneralAMCQuestionId) =>
        getQuestionTextsByQuestionId(id, questionnaireFormEntity.questions);

    return {
        id: questionnaireFormEntity?.entity?.id || "",
        title: "General questionnaire",
        isValid: false,
        sections: [
            {
                title: "Data comparability with previous year's data",
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
                        disabled: isViewOnlyMode,
                        ...fromQuestions("isSameAsLastYear"),
                    },
                ],
            },
            {
                title: "Shortages in public sector",
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
                        disabled: isViewOnlyMode,
                        ...fromQuestions("shortageInPublicSector"),
                    },
                    {
                        id: fromIdsDictionary("detailOnShortageInPublicSector"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.detailOnShortageInPublicSector || "",
                        multiline: false,
                        required: YesNoUnknownValues.YES === questionnaireFormEntity?.entity?.shortageInPublicSector,
                        disabled: isViewOnlyMode,
                        ...fromQuestions("detailOnShortageInPublicSector"),
                    },
                ],
            },
            {
                title: "Shortages in private sector",
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
                        disabled: isViewOnlyMode,
                        ...fromQuestions("shortageInPrivateSector"),
                    },
                    {
                        id: fromIdsDictionary("detailOnShortageInPrivateSector"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.detailOnShortageInPrivateSector || "",
                        multiline: false,
                        required: YesNoUnknownValues.YES === questionnaireFormEntity?.entity?.shortageInPrivateSector,
                        disabled: isViewOnlyMode,
                        ...fromQuestions("detailOnShortageInPrivateSector"),
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
                        disabled: isViewOnlyMode,
                        ...fromQuestions("generalComments"),
                    },
                ],
            },
            {
                title: "Antimicrobial classes reported",
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
                            yesNoOption.getBooleanFromValue(questionnaireFormEntity?.entity?.antibacterials || "0") ||
                            false,
                        required: true,
                        showIsRequired: true,
                        disabled: isViewOnlyMode || !!amcQuestionnaire?.hasAMClassForm("antibacterials"),
                        ...fromQuestions("antibacterials"),
                    },
                    {
                        id: fromIdsDictionary("antifungals"),
                        isVisible: true,
                        errors: [],
                        type: "boolean",
                        label: i18n.t("Yes"),
                        value:
                            yesNoOption.getBooleanFromValue(questionnaireFormEntity?.entity?.antifungals || "0") ||
                            false,
                        required: true,
                        showIsRequired: true,
                        disabled: isViewOnlyMode || !!amcQuestionnaire?.hasAMClassForm("antifungals"),
                        ...fromQuestions("antifungals"),
                    },
                    {
                        id: fromIdsDictionary("antivirals"),
                        isVisible: true,
                        errors: [],
                        type: "boolean",
                        label: i18n.t("Yes"),
                        value:
                            yesNoOption.getBooleanFromValue(questionnaireFormEntity?.entity?.antivirals || "0") ||
                            false,
                        required: true,
                        showIsRequired: true,
                        disabled: isViewOnlyMode || !!amcQuestionnaire?.hasAMClassForm("antivirals"),
                        ...fromQuestions("antivirals"),
                    },
                    {
                        id: fromIdsDictionary("antituberculosis"),
                        isVisible: true,
                        errors: [],
                        type: "boolean",
                        label: i18n.t("Yes"),
                        value:
                            yesNoOption.getBooleanFromValue(questionnaireFormEntity?.entity?.antituberculosis || "0") ||
                            false,
                        required: true,
                        showIsRequired: true,
                        disabled: isViewOnlyMode || !!amcQuestionnaire?.hasAMClassForm("antituberculosis"),
                        ...fromQuestions("antituberculosis"),
                    },
                    {
                        id: fromIdsDictionary("antimalaria"),
                        isVisible: true,
                        errors: [],
                        type: "boolean",
                        label: i18n.t("Yes"),
                        value:
                            yesNoOption.getBooleanFromValue(questionnaireFormEntity?.entity?.antimalaria || "0") ||
                            false,
                        required: true,
                        showIsRequired: true,
                        disabled: isViewOnlyMode || !!amcQuestionnaire?.hasAMClassForm("antimalaria"),
                        ...fromQuestions("antimalaria"),
                    },
                ],
            },
        ],
    };
}
