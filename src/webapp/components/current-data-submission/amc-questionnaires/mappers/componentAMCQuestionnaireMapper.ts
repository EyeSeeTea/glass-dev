import _ from "lodash";
import {
    FormFieldState,
    getAllFieldsFromSections,
    getFieldIdFromIdsDictionary,
    getMultipleOptionsFieldValue,
    getStringFieldValue,
} from "../../../form/presentation-entities/FormFieldsState";
import { FormState } from "../../../form/presentation-entities/FormState";
import { ComponentAMCQuestionnaireFormEntity } from "../presentation-entities/QuestionnaireFormEntity";
import { MapToAMCQuestionnaireParams, MapToFormStateParams } from "./mapperTypes";
import { getOptionCodeFromFieldValue, getQuestionTextsByQuestionId, mapToFormOptions } from "./mapperUtils";
import {
    ComponentAMCQuestionId,
    ComponentAMCQuestionnaire,
    ComponentAMCQuestionnaireAttributes,
    ComponentAMCQuestionnaireBaseAttributes,
} from "../../../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";
import { YesNoUnknownValues } from "../../../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import i18n from "../../../../../locales";
import { getValidationMessage } from "../../../../../domain/entities/amc-questionnaires/ValidationError";
import { UNPopulation } from "../../../../../domain/entities/amc-questionnaires/UNPopulation";

export type ComponentAMCQuestionnaireContext = {
    unPopulation?: UNPopulation;
};

export function mapFormStateToComponentAMCQuestionnaire(
    params: MapToAMCQuestionnaireParams<ComponentAMCQuestionnaireFormEntity>
): ComponentAMCQuestionnaire {
    const { formState, formEntity, options, editMode } = params;
    const baseAttributes = getComponentAMCQuestionnaireBaseAttributes(formEntity, editMode);

    const allFields: FormFieldState[] = getAllFieldsFromSections(formState.sections);

    const getStratum = (stratumKey: keyof typeof ComponentAMCQuestionnaireStratumFieldIds) =>
        _.compact(
            getMultipleOptionsFieldValue(stratumKey, allFields).map(selectedOption => {
                return options.strataOptions.find(option => option.code === selectedOption)?.code;
            })
        );
    const antibacterialStratum = getStratum("antibacterialStratum");
    const antifungalStratum = getStratum("antifungalStratum");
    const antiviralStratum = getStratum("antiviralStratum");
    const antituberculosisStratum = getStratum("antituberculosisStratum");
    const antimalariaStratum = getStratum("antimalariaStratum");

    const excludedSubstances = getOptionCodeFromFieldValue(
        "excludedSubstances",
        options.yesNoUnknownOptions,
        allFields
    );
    const listOfExcludedSubstances = getStringFieldValue("listOfExcludedSubstances", allFields);
    const typeOfDataReported = getOptionCodeFromFieldValue("typeOfDataReported", options.dataLevelOptions, allFields);
    const procurementTypeOfDataReported = getOptionCodeFromFieldValue(
        "procurementTypeOfDataReported",
        options.procurementLevelOptions,
        allFields
    );
    const mixedTypeOfData = getStringFieldValue("mixedTypeOfData", allFields);
    const sourcesOfDataReported = _.compact(
        getMultipleOptionsFieldValue("sourcesOfDataReported", allFields).map(selectedOption => {
            return options.dataSourceOptions.find(option => option.code === selectedOption)?.code;
        })
    );
    const commentsForDataSources = getStringFieldValue("commentsForDataSources", allFields);
    const sameAsUNPopulation = getOptionCodeFromFieldValue("sameAsUNPopulation", options.yesNoOptions, allFields);
    const unPopulation = parseInt(getStringFieldValue("unPopulation", allFields)) || undefined;
    const populationCovered = parseFloat(getStringFieldValue("populationCovered", allFields)) || undefined;
    const sourceOfNationalPopulation = getOptionCodeFromFieldValue(
        "sourceOfNationalPopulation",
        options.nationalPopulationDataSourceOptions,
        allFields
    );
    const nationalCoverage = parseFloat(getStringFieldValue("nationalCoverage", allFields)) || undefined;
    const unPopulationCoverage = parseFloat(getStringFieldValue("unPopulationCoverage", allFields)) || undefined;
    const commentOnNationalPopulation = getStringFieldValue("commentOnNationalPopulation", allFields);
    const coverageVolumeWithinTheStratum = getOptionCodeFromFieldValue(
        "coverageVolumeWithinTheStratum",
        options.proportion50to100UnknownOptions,
        allFields
    );
    const commentOnCoverageWithinTheStratum = getStringFieldValue("commentOnCoverageWithinTheStratum", allFields);

    if (
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
        antibacterialStratum: antibacterialStratum,
        antifungalStratum: antifungalStratum,
        antiviralStratum: antiviralStratum,
        antituberculosisStratum: antituberculosisStratum,
        antimalariaStratum: antimalariaStratum,
        excludedSubstances: excludedSubstances,
        listOfExcludedSubstances: listOfExcludedSubstances,
        typeOfDataReported: typeOfDataReported,
        procurementTypeOfDataReported: procurementTypeOfDataReported,
        mixedTypeOfData: mixedTypeOfData,
        sourcesOfDataReported: sourcesOfDataReported,
        commentsForDataSources: commentsForDataSources,
        sameAsUNPopulation: sameAsUNPopulation,
        unPopulation: unPopulation,
        populationCovered: populationCovered,
        sourceOfNationalPopulation: sourceOfNationalPopulation,
        nationalCoverage: nationalCoverage,
        unPopulationCoverage: unPopulationCoverage,
        commentOnNationalPopulation: commentOnNationalPopulation,
        coverageVolumeWithinTheStratum: coverageVolumeWithinTheStratum,
        commentOnCoverageWithinTheStratum: commentOnCoverageWithinTheStratum,
    };

    const generalAMCQuestionnaireValidation = ComponentAMCQuestionnaire.validateAndCreate(
        ComponentAMCQuestionnaireAttributes
    );
    const validGeneralAMCQuestionnaire = generalAMCQuestionnaireValidation.match({
        error: errors => {
            throw new Error(errors.map(error => getValidationMessage(error)).join(", "));
        },
        success: ComponentAMCQuestionnaire => ComponentAMCQuestionnaire,
    });

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

export const ComponentAMCQuestionnaireStratumFieldIds = {
    antibacterialStratum: "antibacterialStratum",
    antifungalStratum: "antifungalStratum",
    antiviralStratum: "antiviralStratum",
    antituberculosisStratum: "antituberculosisStratum",
    antimalariaStratum: "antimalariaStratum",
} as const;

export const ComponentAMCQuestionnaireFieldIds = {
    ...ComponentAMCQuestionnaireStratumFieldIds,
    excludedSubstances: "excludedSubstances",
    listOfExcludedSubstances: "listOfExcludedSubstances",
    typeOfDataReported: "typeOfDataReported",
    procurementTypeOfDataReported: "procurementTypeOfDataReported",
    mixedTypeOfData: "mixedTypeOfData",
    sourcesOfDataReported: "sourcesOfDataReported",
    commentsForDataSources: "commentsForDataSources",
    sameAsUNPopulation: "sameAsUNPopulation",
    unPopulation: "unPopulation",
    populationCovered: "populationCovered",
    sourceOfNationalPopulation: "sourceOfNationalPopulation",
    nationalCoverage: "nationalCoverage",
    unPopulationCoverage: "unPopulationCoverage",
    commentOnNationalPopulation: "commentOnNationalPopulation",
    coverageVolumeWithinTheStratum: "coverageVolumeWithinTheStratum",
    commentOnCoverageWithinTheStratum: "commentOnCoverageWithinTheStratum",
} as const;

function getStratumField(
    stratumKey: keyof typeof ComponentAMCQuestionnaireStratumFieldIds,
    params: MapToFormStateParams<ComponentAMCQuestionnaireFormEntity>
): FormFieldState {
    const { questionnaireFormEntity, options, isViewOnlyMode, amcQuestionnaire } = params;
    const fieldId = getFieldIdFromIdsDictionary(stratumKey, ComponentAMCQuestionnaireFieldIds);
    const question = getQuestionTextsByQuestionId(stratumKey, questionnaireFormEntity.questions);
    const selfOptions = options.strataOptions.filter(option =>
        (questionnaireFormEntity?.entity?.[stratumKey] ?? []).includes(option.code)
    );
    const availableStratas =
        amcQuestionnaire?.getAvailableStrataOptionsForComponentQ(
            options.strataOptions,
            ComponentAMCQuestionnaire.getAntimicrobialClassByStratumProperty(stratumKey)
        ) ?? [];
    const strataOptionsWithSelf = [...new Set([...selfOptions, ...availableStratas])];
    return {
        id: fieldId,
        isVisible: strataOptionsWithSelf.length > 0,
        errors: [],
        type: "select",
        multiple: true,
        value: questionnaireFormEntity?.entity?.[stratumKey] || [],
        options: mapToFormOptions(strataOptionsWithSelf),
        required: false,
        showIsRequired: false,
        disabled: isViewOnlyMode,
        ...question,
    };
}

export function mapComponentAMCQuestionnaireToInitialFormState(
    params: MapToFormStateParams<ComponentAMCQuestionnaireFormEntity, ComponentAMCQuestionnaireContext>
): FormState {
    const { questionnaireFormEntity, options, isViewOnlyMode, amcQuestionnaire } = params;

    if (!amcQuestionnaire) {
        throw new Error("AMC Questionnaire required for the Component questionnaire");
    }

    const fromIdsDictionary = (key: keyof typeof ComponentAMCQuestionnaireFieldIds) =>
        getFieldIdFromIdsDictionary(key, ComponentAMCQuestionnaireFieldIds);

    const fromQuestions = (id: ComponentAMCQuestionId) =>
        getQuestionTextsByQuestionId(id, questionnaireFormEntity.questions);

    const unPopulation = questionnaireFormEntity?.entity?.unPopulation?.toString();
    const contextUnPopulation = params.context?.unPopulation?.population?.toString() || "";

    return {
        id: questionnaireFormEntity.entity?.id ?? "",
        title: "Component questionnaire",
        isValid: false,
        sections: [
            {
                title: i18n.t("Component Antimicrobial Class Stratum"),
                id: "antimicrobial_stratum_section",
                isVisible: true,
                required: true,
                fields: [
                    getStratumField("antibacterialStratum", params),
                    getStratumField("antifungalStratum", params),
                    getStratumField("antiviralStratum", params),
                    getStratumField("antituberculosisStratum", params),
                    getStratumField("antimalariaStratum", params),
                    {
                        id: "select-all-amclass-stratum",
                        isVisible: true,
                        type: "boolean",
                        value: false,
                        required: false,
                        showIsRequired: false,
                        text: i18n.t("Use all available antimicrobial classes / stratum combinations"),
                        errors: [],
                    },
                ],
            },
            {
                title: "Component General questionnaire",
                id: "component_section",
                isVisible: true,
                required: true,
                fields: [
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
                        disabled: isViewOnlyMode,
                        ...fromQuestions("excludedSubstances"),
                    },
                    {
                        id: fromIdsDictionary("listOfExcludedSubstances"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.listOfExcludedSubstances || "",
                        multiline: false,
                        required: YesNoUnknownValues.YES === questionnaireFormEntity?.entity?.excludedSubstances,
                        disabled: isViewOnlyMode,
                        ...fromQuestions("listOfExcludedSubstances"),
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
                        disabled: isViewOnlyMode,
                        ...fromQuestions("typeOfDataReported"),
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
                        disabled: isViewOnlyMode,
                        ...fromQuestions("procurementTypeOfDataReported"),
                    },
                    {
                        id: fromIdsDictionary("mixedTypeOfData"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.mixedTypeOfData || "",
                        multiline: false,
                        required: false,
                        disabled: isViewOnlyMode,
                        ...fromQuestions("mixedTypeOfData"),
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
                        disabled: isViewOnlyMode,
                        ...fromQuestions("sourcesOfDataReported"),
                    },
                    {
                        id: fromIdsDictionary("commentsForDataSources"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.commentsForDataSources || "",
                        multiline: false,
                        required: false,
                        disabled: isViewOnlyMode,
                        ...fromQuestions("commentsForDataSources"),
                    },
                    {
                        id: fromIdsDictionary("unPopulation"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: unPopulation || contextUnPopulation || "",
                        required: false,
                        disabled: true,
                        helperText:
                            !unPopulation && !contextUnPopulation
                                ? i18n.t("Error loading value from World Prospect Population")
                                : undefined,
                        ...fromQuestions("unPopulation"),
                    },
                    {
                        id: fromIdsDictionary("sameAsUNPopulation"),
                        isVisible: true,
                        errors: [],
                        type: "radio",
                        multiple: false,
                        options: mapToFormOptions(options.yesNoOptions),
                        value: questionnaireFormEntity?.entity?.sameAsUNPopulation || "",
                        required: true,
                        showIsRequired: true,
                        disabled: isViewOnlyMode,
                        ...fromQuestions("sameAsUNPopulation"),
                    },
                    {
                        id: fromIdsDictionary("populationCovered"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.populationCovered?.toString() || "",
                        multiline: false,
                        required: false,
                        disabled: isViewOnlyMode,
                        ...fromQuestions("populationCovered"),
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
                        disabled: isViewOnlyMode,
                        ...fromQuestions("sourceOfNationalPopulation"),
                    },
                    {
                        id: fromIdsDictionary("nationalCoverage"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.nationalCoverage?.toString() || "",
                        multiline: false,
                        required: false,
                        disabled: isViewOnlyMode,
                        ...fromQuestions("nationalCoverage"),
                    },
                    {
                        id: fromIdsDictionary("unPopulationCoverage"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.unPopulationCoverage?.toString() || "",
                        multiline: false,
                        required: false,
                        disabled: true,
                        ...fromQuestions("unPopulationCoverage"),
                    },
                    {
                        id: fromIdsDictionary("commentOnNationalPopulation"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.commentOnNationalPopulation || "",
                        multiline: false,
                        required: false,
                        disabled: isViewOnlyMode,
                        ...fromQuestions("commentOnNationalPopulation"),
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
                        disabled: isViewOnlyMode,
                        ...fromQuestions("coverageVolumeWithinTheStratum"),
                    },
                    {
                        id: fromIdsDictionary("commentOnCoverageWithinTheStratum"),
                        isVisible: true,
                        errors: [],
                        type: "text",
                        value: questionnaireFormEntity?.entity?.commentOnCoverageWithinTheStratum || "",
                        multiline: false,
                        required: false,
                        disabled: isViewOnlyMode,
                        ...fromQuestions("commentOnCoverageWithinTheStratum"),
                    },
                ],
            },
        ],
    };
}
