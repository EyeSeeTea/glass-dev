import {
    FormFieldState,
    getAllFieldsFromSections,
    getFieldIdFromIdsDictionary,
    getMultipleOptionsFieldValue,
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
import { getDisabledStratas } from "../../../../../domain/entities/amc-questionnaires/StrataOption";

export function mapFormStateToAMClassAMCQuestionnaire(
    params: MapToAMCQuestionnaireParams<AMClassAMCQuestionnaireFormEntity>
): AMClassAMCQuestionnaire {
    const { formState, options, formEntity } = params;

    const allFields: FormFieldState[] = getAllFieldsFromSections(formState.sections);

    const antimicrobialClass = options.antimicrobialClassOptions.find(
        option => option.code === getStringFieldValue("antimicrobialClass", allFields)
    )?.code;
    const stratas = _.compact(
        getMultipleOptionsFieldValue("stratas", allFields).map(selectedOption => {
            return options.strataOptions.find(option => option.code === selectedOption)?.code;
        })
    );
    const estVolumeTotalHealthLevel = options.proportion50to100Options.find(
        option => option.code === getStringFieldValue("estVolumeTotalHealthLevel", allFields)
    )?.code;
    const estVolumeHospitalHealthLevel = options.proportion50to100Options.find(
        option => option.code === getStringFieldValue("estVolumeHospitalHealthLevel", allFields)
    )?.code;
    const estVolumeCommunityHealthLevel = options.proportion50to100Options.find(
        option => option.code === getStringFieldValue("estVolumeCommunityHealthLevel", allFields)
    )?.code;

    if (!antimicrobialClass || !stratas) {
        throw new Error("Missing required AM Class AMC Questionnaire attributes");
    }

    const amClassAMCQuestionnaireAttributes: AMClassAMCQuestionnaireAttributes = {
        id: formEntity.entity?.id ?? "",
        antimicrobialClass,
        stratas,
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
    stratas: "stratas",
    estVolumeTotalHealthLevel: "estVolumeTotalHealthLevel",
    estVolumeHospitalHealthLevel: "estVolumeHospitalHealthLevel",
    estVolumeCommunityHealthLevel: "estVolumeCommunityHealthLevel",
} as const;

export function mapAMClassAMCQuestionnaireToInitialFormState(
    params: MapToFormStateParams<AMClassAMCQuestionnaireFormEntity>
): FormState {
    const { questionnaireFormEntity, options, isViewOnlyMode, amcQuestionnaire } = params;

    if (!amcQuestionnaire) {
        throw new Error("AMC Questionnaire required for the AM Class questionnaire");
    }

    const fromIdsDictionary = (key: keyof typeof amClassAMCQuestionnaireFieldIds) =>
        getFieldIdFromIdsDictionary(key, amClassAMCQuestionnaireFieldIds);

    const fromQuestions = (id: AMClassAMCQuestionId) => getQuestionById(id, questionnaireFormEntity.questions);

    const antimicrobialClassValue = questionnaireFormEntity?.entity?.antimicrobialClass;
    const antimicrobialClassOption = options.antimicrobialClassOptions.find(
        option => option.code === antimicrobialClassValue
    );
    const availableAntimicrobialClassOptions = amcQuestionnaire.getAvailableAMClassOptionsForAMClassQ(
        options.antimicrobialClassOptions
    );
    const antimicrobialClassOptinsWithSelf = antimicrobialClassOption
        ? [...new Set([antimicrobialClassOption, ...availableAntimicrobialClassOptions])]
        : availableAntimicrobialClassOptions;

    const disabledStratas = getDisabledStratas(questionnaireFormEntity?.entity?.stratas || []);

    return {
        id: questionnaireFormEntity.entity?.id ?? "",
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
                        value: antimicrobialClassValue || "",
                        options: mapToFormOptions(antimicrobialClassOptinsWithSelf),
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("antimicrobialClass"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("stratas"),
                        isVisible: true,
                        errors: [],
                        type: "checkboxes",
                        multiple: true,
                        value: questionnaireFormEntity?.entity?.stratas || [],
                        options: mapToFormOptions(options.strataOptions, disabledStratas),
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("stratas"),
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
