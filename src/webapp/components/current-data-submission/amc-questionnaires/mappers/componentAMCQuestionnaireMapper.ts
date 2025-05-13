import _ from "lodash";
import {
    FormFieldState,
    getAllFieldsFromSections,
    getBooleanFieldValue,
    getFieldIdFromIdsDictionary,
    getMultipleOptionsFieldValue,
    getStringFieldValue,
} from "../../../form/presentation-entities/FormFieldsState";
import { FormState } from "../../../form/presentation-entities/FormState";
import { ComponentAMCQuestionnaireFormEntity } from "../presentation-entities/QuestionnaireFormEntity";
import { MapToAMCQuestionnaireParams, MapToFormStateParams } from "./mapperTypes";
import { getQuestionById, mapToFormOptions } from "./mapperUtils";
import {
    ComponentAMCQuestionId,
    ComponentAMCQuestionnaire,
    ComponentAMCQuestionnaireAttributes,
    ComponentAMCQuestionnaireBaseAttributes,
} from "../../../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";
import { YesNoUnknownValues } from "../../../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import { yesNoOption } from "../../../../../domain/entities/amc-questionnaires/YesNoOption";
import i18n from "../../../../../locales";

export function mapFormStateToComponentAMCQuestionnaire(
    params: MapToAMCQuestionnaireParams<ComponentAMCQuestionnaireFormEntity>
): ComponentAMCQuestionnaire {
    const { formState, formEntity, options, editMode } = params;
    const baseAttributes = getComponentAMCQuestionnaireBaseAttributes(formEntity, editMode);

    const allFields: FormFieldState[] = getAllFieldsFromSections(formState.sections);

    const antimicrobialClasses = _.compact(
        getMultipleOptionsFieldValue("antimicrobialClasses", allFields).map(selectedOption => {
            return options.antimicrobialClassOptions.find(option => option.code === selectedOption)?.code;
        })
    );
    const componentStrata = options.strataOptions.find(
        option => option.code === getStringFieldValue("componentStrata", allFields)
    )?.code;
    const excludedSubstances = options.yesNoUnknownOptions.find(
        option => option.code === getStringFieldValue("excludedSubstances", allFields)
    )?.code;
    const listOfExcludedSubstances = getStringFieldValue("listOfExcludedSubstances", allFields);
    const typeOfDataReported = options.dataLevelOptions.find(
        option => option.code === getStringFieldValue("typeOfDataReported", allFields)
    )?.code;
    const procurementTypeOfDataReported = options.procurementLevelOptions.find(
        option => option.code === getStringFieldValue("procurementTypeOfDataReported", allFields)
    )?.code;
    const mixedTypeOfData = getStringFieldValue("mixedTypeOfData", allFields);
    const sourcesOfDataReported = _.compact(
        getMultipleOptionsFieldValue("sourcesOfDataReported", allFields).map(selectedOption => {
            return options.dataSourceOptions.find(option => option.code === selectedOption)?.code;
        })
    );
    const commentsForDataSources = getStringFieldValue("commentsForDataSources", allFields);
    const sameAsUNPopulation = yesNoOption.getValueFromBoolean(getBooleanFieldValue("sameAsUNPopulation", allFields));
    const sourceOfNationalPopulation = options.nationalPopulationDataSourceOptions.find(
        option => option.code === getStringFieldValue("sourceOfNationalPopulation", allFields)
    )?.code;
    const otherSourceForNationalPopulation = getStringFieldValue("otherSourceForNationalPopulation", allFields);
    const commentOnNationalPopulation = getStringFieldValue("commentOnNationalPopulation", allFields);
    const coverageVolumeWithinTheStratum = options.proportion50to100UnknownOptions.find(
        option => option.code === getStringFieldValue("coverageVolumeWithinTheStratum", allFields)
    )?.code;
    const commentOnCoverageWithinTheStratum = getStringFieldValue("commentOnCoverageWithinTheStratum", allFields);

    if (
        antimicrobialClasses.length === 0 ||
        !componentStrata ||
        !excludedSubstances ||
        !typeOfDataReported ||
        sourcesOfDataReported.length === 0 ||
        !sameAsUNPopulation ||
        !coverageVolumeWithinTheStratum
    ) {
        throw new Error("Missing required Component AMC Questionnaire attributes");
    }

    const ComponentAMCQuestionnaireAttributes: ComponentAMCQuestionnaireAttributes = {
        ...baseAttributes,
        antimicrobialClasses: antimicrobialClasses,
        componentStrata: componentStrata,
        excludedSubstances: excludedSubstances,
        listOfExcludedSubstances: listOfExcludedSubstances,
        typeOfDataReported: typeOfDataReported,
        procurementTypeOfDataReported: procurementTypeOfDataReported,
        mixedTypeOfData: mixedTypeOfData,
        sourcesOfDataReported: sourcesOfDataReported,
        commentsForDataSources: commentsForDataSources,
        sameAsUNPopulation: sameAsUNPopulation,
        sourceOfNationalPopulation: sourceOfNationalPopulation,
        otherSourceForNationalPopulation: otherSourceForNationalPopulation,
        commentOnNationalPopulation: commentOnNationalPopulation,
        coverageVolumeWithinTheStratum: coverageVolumeWithinTheStratum,
        commentOnCoverageWithinTheStratum: commentOnCoverageWithinTheStratum,
    };

    const generalAMCQuestionnaireValidation = ComponentAMCQuestionnaire.validateAndCreate(
        ComponentAMCQuestionnaireAttributes
    );
    const validGeneralAMCQuestionnaire = generalAMCQuestionnaireValidation.match({
        error: () => undefined,
        success: ComponentAMCQuestionnaire => ComponentAMCQuestionnaire,
    });

    if (!validGeneralAMCQuestionnaire) {
        throw new Error("Invalid Component AMC Questionnaire");
    }

    return validGeneralAMCQuestionnaire;
}

function getComponentAMCQuestionnaireBaseAttributes(
    formEntity: ComponentAMCQuestionnaireFormEntity,
    editMode: boolean
): ComponentAMCQuestionnaireBaseAttributes {
    if (editMode) {
        if (!formEntity.entity) {
            throw new Error("Form entity is not defined");
        }
        return {
            id: formEntity.entity.id,
            status: formEntity.entity.status,
            created: formEntity.entity.created,
            lastUpdated: new Date(),
        };
    } else {
        return {
            id: "",
            status: "ACTIVE",
            created: new Date(),
            lastUpdated: new Date(),
        };
    }
}

export const ComponentAMCQuestionnaireFieldIds = {
    antimicrobialClasses: "antimicrobialClasses",
    componentStrata: "componentStrata",
    excludedSubstances: "excludedSubstances",
    listOfExcludedSubstances: "listOfExcludedSubstances",
    typeOfDataReported: "typeOfDataReported",
    procurementTypeOfDataReported: "procurementTypeOfDataReported",
    mixedTypeOfData: "mixedTypeOfData",
    sourcesOfDataReported: "sourcesOfDataReported",
    commentsForDataSources: "commentsForDataSources",
    sameAsUNPopulation: "sameAsUNPopulation",
    sourceOfNationalPopulation: "sourceOfNationalPopulation",
    otherSourceForNationalPopulation: "otherSourceForNationalPopulation",
    commentOnNationalPopulation: "commentOnNationalPopulation",
    coverageVolumeWithinTheStratum: "coverageVolumeWithinTheStratum",
    commentOnCoverageWithinTheStratum: "commentOnCoverageWithinTheStratum",
} as const;

export function mapComponentAMCQuestionnaireToInitialFormState(
    params: MapToFormStateParams<ComponentAMCQuestionnaireFormEntity>
): FormState {
    const { questionnaireFormEntity, options, isViewOnlyMode, amcQuestionnaire } = params;

    if (!amcQuestionnaire) {
        throw new Error("AMC Questionnaire required for the Component questionnaire");
    }

    const fromIdsDictionary = (key: keyof typeof ComponentAMCQuestionnaireFieldIds) =>
        getFieldIdFromIdsDictionary(key, ComponentAMCQuestionnaireFieldIds);

    const fromQuestions = (id: ComponentAMCQuestionId) => getQuestionById(id, questionnaireFormEntity.questions);

    // TODO: remove options in selector according with specifications
    return {
        id: questionnaireFormEntity.entity?.id ?? "",
        title: "Component questionnaire",
        isValid: false,
        sections: [
            {
                title: "Component General questionnaire",
                id: "component_section",
                isVisible: true,
                required: true,
                fields: [
                    {
                        id: fromIdsDictionary("antimicrobialClasses"),
                        isVisible: true,
                        errors: [],
                        type: "select",
                        multiple: true,
                        value: questionnaireFormEntity?.entity?.antimicrobialClasses || [],
                        options: mapToFormOptions(options.antimicrobialClassOptions),
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("antimicrobialClasses"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("componentStrata"),
                        isVisible: true,
                        errors: [],
                        type: "select",
                        multiple: false,
                        value: questionnaireFormEntity?.entity?.componentStrata || "",
                        options: mapToFormOptions(options.strataOptions),
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("componentStrata"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("excludedSubstances"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        options: mapToFormOptions(options.yesNoUnknownOptions),
                        value: questionnaireFormEntity?.entity?.excludedSubstances || "",
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("excludedSubstances"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("listOfExcludedSubstances"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.listOfExcludedSubstances || "",
                        multiline: false,
                        required: YesNoUnknownValues.YES === questionnaireFormEntity?.entity?.excludedSubstances,
                        text: fromQuestions("listOfExcludedSubstances"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("typeOfDataReported"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        options: mapToFormOptions(options.dataLevelOptions),
                        value: questionnaireFormEntity?.entity?.typeOfDataReported || "",
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("typeOfDataReported"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("procurementTypeOfDataReported"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        options: mapToFormOptions(options.procurementLevelOptions),
                        value: questionnaireFormEntity?.entity?.procurementTypeOfDataReported || "",
                        required: false,
                        text: fromQuestions("procurementTypeOfDataReported"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("mixedTypeOfData"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.mixedTypeOfData || "",
                        multiline: false,
                        required: false,
                        text: fromQuestions("mixedTypeOfData"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("sourcesOfDataReported"),
                        isVisible: true,
                        errors: [],
                        type: "select",
                        multiple: true,
                        value: questionnaireFormEntity?.entity?.sourcesOfDataReported || [],
                        options: mapToFormOptions(options.dataSourceOptions),
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("sourcesOfDataReported"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("commentsForDataSources"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.commentsForDataSources || "",
                        multiline: false,
                        required: false,
                        text: fromQuestions("commentsForDataSources"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("sameAsUNPopulation"),
                        isVisible: true,
                        errors: [],
                        type: "boolean",
                        label: i18n.t("Yes"),
                        value:
                            yesNoOption.getBooleanFromValue(
                                questionnaireFormEntity?.entity?.sameAsUNPopulation || "0"
                            ) || false,
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("sameAsUNPopulation"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("sourceOfNationalPopulation"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        options: mapToFormOptions(options.nationalPopulationDataSourceOptions),
                        value: questionnaireFormEntity?.entity?.sourceOfNationalPopulation || "",
                        required: false,
                        text: fromQuestions("sourceOfNationalPopulation"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("otherSourceForNationalPopulation"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.otherSourceForNationalPopulation || "",
                        multiline: false,
                        required: false,
                        text: fromQuestions("otherSourceForNationalPopulation"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("commentOnNationalPopulation"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.commentOnNationalPopulation || "",
                        multiline: false,
                        required: false,
                        text: fromQuestions("commentOnNationalPopulation"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("coverageVolumeWithinTheStratum"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        options: mapToFormOptions(options.proportion50to100UnknownOptions),
                        value: questionnaireFormEntity?.entity?.coverageVolumeWithinTheStratum || "",
                        required: true,
                        showIsRequired: true,
                        text: fromQuestions("coverageVolumeWithinTheStratum"),
                        disabled: isViewOnlyMode,
                    },
                    {
                        id: fromIdsDictionary("commentOnCoverageWithinTheStratum"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.commentOnCoverageWithinTheStratum || "",
                        multiline: false,
                        required: false,
                        text: fromQuestions("commentOnCoverageWithinTheStratum"),
                        disabled: isViewOnlyMode,
                    },
                ],
            },
        ],
    };
}
