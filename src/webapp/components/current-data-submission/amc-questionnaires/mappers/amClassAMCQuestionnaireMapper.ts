import {
    FormFieldState,
    getAllFieldsFromSections,
    getFieldIdFromIdsDictionary,
    getStringFieldValue,
} from "../../../form/presentation-entities/FormFieldsState";
import { FormState } from "../../../form/presentation-entities/FormState";
import { AMClassAMCQuestionnaireFormEntity } from "../presentation-entities/QuestionnaireFormEntity";
import { MapToAMCQuestionnaireParams, MapToFormStateParams } from "./mapperTypes";
import { getQuestionById, mapToFormOptions } from "./mapperUtils";
import {
    AMClassAMCQuestionId,
    AMClassAMCQuestionnaire,
    AMClassAMCQuestionnaireAttributes,
} from "../../../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";

export function mapFormStateToAMClassAMCQuestionnaire(
    params: MapToAMCQuestionnaireParams<AMClassAMCQuestionnaireFormEntity>
): AMClassAMCQuestionnaire {
    const { formState, options } = params;

    const allFields: FormFieldState[] = getAllFieldsFromSections(formState.sections);

    const antimicrobialClass = options.antimicrobialClassOptions.find(
        option => option.code === getStringFieldValue("antimicrobialClass", allFields)
    )?.code;
    const healthSector = options.healthSectorOptions.find(
        option => option.code === getStringFieldValue("healthSector", allFields)
    )?.code;
    const healthLevel = options.healthLevelOptions.find(
        option => option.code === getStringFieldValue("healthLevel", allFields)
    )?.code;
    const estVolumeTotalHealthLevel = options.proportion50to100Options.find(
        option => option.code === getStringFieldValue("estVolumeTotalHealthLevel", allFields)
    )?.code;
    const estVolumeHospitalHealthLevel = options.proportion50to100Options.find(
        option => option.code === getStringFieldValue("estVolumeHospitalHealthLevel", allFields)
    )?.code;
    const estVolumeCommunityHealthLevel = options.proportion50to100Options.find(
        option => option.code === getStringFieldValue("estVolumeCommunityHealthLevel", allFields)
    )?.code;

    if (!antimicrobialClass || !healthSector || !healthLevel) {
        throw new Error("Missing required AM Class AMC Questionnaire attributes");
    }

    const amClassAMCQuestionnaireAttributes: AMClassAMCQuestionnaireAttributes = {
        id: "",
        antimicrobialClass,
        healthSector,
        healthLevel,
        estVolumeTotalHealthLevel,
        estVolumeHospitalHealthLevel,
        estVolumeCommunityHealthLevel,
    };

    const generalAMCQuestionnaireValidation = AMClassAMCQuestionnaire.validateAndCreate(
        amClassAMCQuestionnaireAttributes
    );
    const validGeneralAMCQuestionnaire = generalAMCQuestionnaireValidation.match({
        error: () => undefined,
        success: amClassAMCQuestionnaire => amClassAMCQuestionnaire,
    });

    if (!validGeneralAMCQuestionnaire) {
        throw new Error("Invalid AM Class AMC Questionnaire");
    }

    return validGeneralAMCQuestionnaire;
}

export const amClassAMCQuestionnaireFieldIds = {
    antimicrobialClass: "antimicrobialClass",
    healthSector: "healthSector",
    healthLevel: "healthLevel",
    estVolumeTotalHealthLevel: "estVolumeTotalHealthLevel",
    estVolumeHospitalHealthLevel: "estVolumeHospitalHealthLevel",
    estVolumeCommunityHealthLevel: "estVolumeCommunityHealthLevel",
} as const;

export function mapAMClassAMCQuestionnaireToInitialFormState(
    params: MapToFormStateParams<AMClassAMCQuestionnaireFormEntity>
): FormState {
    const { questionnaireFormEntity, options, isViewOnlyMode } = params;

    const fromIdsDictionary = (key: keyof typeof amClassAMCQuestionnaireFieldIds) =>
        getFieldIdFromIdsDictionary(key, amClassAMCQuestionnaireFieldIds);

    const fromQuestions = (id: AMClassAMCQuestionId) => getQuestionById(id, questionnaireFormEntity.questions);

    return {
        id: "",
        title: "AM Class questionnaire",
        isValid: false,
        sections: [
            {
                title: "AM Class General questionnaire",
                id: "general_section",
                isVisible: true,
                required: true,
                fields: [
                    {
                        id: fromIdsDictionary("antimicrobialClass"),
                        isVisible: true,
                        errors: [],
                        type: "select",
                        multiple: false,
                        value: questionnaireFormEntity?.entity?.antimicrobialClass || "",
                        options: mapToFormOptions(options.antimicrobialClassOptions),
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("antimicrobialClass"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("healthSector"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        value: questionnaireFormEntity?.entity?.healthSector || "",
                        options: mapToFormOptions(options.healthSectorOptions),
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("healthSector"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("healthLevel"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        value: questionnaireFormEntity?.entity?.healthLevel || "",
                        options: mapToFormOptions(options.healthLevelOptions),
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("healthLevel"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("estVolumeTotalHealthLevel"),
                        isVisible: true,
                        errors: [],
                        type: "select",
                        multiple: false,
                        value: questionnaireFormEntity?.entity?.estVolumeTotalHealthLevel || "",
                        options: mapToFormOptions(options.proportion50to100Options),
                        required: false,
                        showIsRequired: false,
                        text: fromQuestions("estVolumeTotalHealthLevel"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("estVolumeHospitalHealthLevel"),
                        isVisible: true,
                        errors: [],
                        type: "select",
                        multiple: false,
                        value: questionnaireFormEntity?.entity?.estVolumeHospitalHealthLevel || "",
                        options: mapToFormOptions(options.proportion50to100Options),
                        required: false,
                        showIsRequired: false,
                        text: fromQuestions("estVolumeHospitalHealthLevel"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("estVolumeCommunityHealthLevel"),
                        isVisible: true,
                        errors: [],
                        type: "select",
                        multiple: false,
                        value: questionnaireFormEntity?.entity?.estVolumeCommunityHealthLevel || "",
                        options: mapToFormOptions(options.proportion50to100Options),
                        required: false,
                        showIsRequired: false,
                        text: fromQuestions("estVolumeCommunityHealthLevel"),
                        disabled: isViewOnlyMode,
                    },
                ],
            },
        ],
    };
}
