import {
    GeneralAMCQuestionId,
    GeneralAMCQuestionnaire,
    GeneralAMCQuestionnaireAttributes,
    GeneralAMCQuestionnaireBaseAttributes,
} from "../../../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { YesNoUnknownValues } from "../../../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import {
    FormFieldState,
    getAllFieldsFromSections,
    getFieldIdFromIdsDictionary,
    getStringFieldValue,
} from "../../../form/presentation-entities/FormFieldsState";
import { FormState } from "../../../form/presentation-entities/FormState";
import { GeneralAMCQuestionnaireFormEntity } from "../presentation-entities/QuestionnaireFormEntity";
import { MapToAMCQuestionnaireParams, MapToFormStateParams } from "./mapperTypes";
import { getOptionCodeFromFieldValue, getQuestionById, mapToFormOptions } from "./mapperUtils";

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
    const antibacterials = getOptionCodeFromFieldValue("antibacterials", options.yesNoOptions, allFields);
    const antifungals = getOptionCodeFromFieldValue("antifungals", options.yesNoOptions, allFields);
    const antivirals = getOptionCodeFromFieldValue("antivirals", options.yesNoOptions, allFields);
    const antituberculosis = getOptionCodeFromFieldValue("antituberculosis", options.yesNoOptions, allFields);
    const antimalaria = getOptionCodeFromFieldValue("antimalaria", options.yesNoOptions, allFields);

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
                        type: "radio",
                        multiple: false,
                        options: mapToFormOptions(options.yesNoOptions),
                        value: questionnaireFormEntity?.entity?.antibacterials || "",
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("antibacterials"),
                        disabled: isViewOnlyMode || !!amcQuestionnaire?.hasAMClassForm("antibacterials"),
                    },
                    {
                        id: fromIdsDictionary("antifungals"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        options: mapToFormOptions(options.yesNoOptions),
                        value: questionnaireFormEntity?.entity?.antifungals || "",
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("antifungals"),
                        disabled: isViewOnlyMode || !!amcQuestionnaire?.hasAMClassForm("antifungals"),
                    },
                    {
                        id: fromIdsDictionary("antivirals"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        options: mapToFormOptions(options.yesNoOptions),
                        value: questionnaireFormEntity?.entity?.antivirals || "",
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("antivirals"),
                        disabled: isViewOnlyMode || !!amcQuestionnaire?.hasAMClassForm("antivirals"),
                    },
                    {
                        id: fromIdsDictionary("antituberculosis"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        options: mapToFormOptions(options.yesNoOptions),
                        value: questionnaireFormEntity?.entity?.antituberculosis || "",
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("antituberculosis"),
                        disabled: isViewOnlyMode || !!amcQuestionnaire?.hasAMClassForm("antituberculosis"),
                    },
                    {
                        id: fromIdsDictionary("antimalaria"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        options: mapToFormOptions(options.yesNoOptions),
                        value: questionnaireFormEntity?.entity?.antimalaria || "",
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("antimalaria"),
                        disabled: isViewOnlyMode || !!amcQuestionnaire?.hasAMClassForm("antimalaria"),
                    },
                ],
            },
        ],
    };
}
