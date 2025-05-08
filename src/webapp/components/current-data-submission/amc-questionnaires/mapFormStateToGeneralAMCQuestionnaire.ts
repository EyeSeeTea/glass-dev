import {
    GeneralAMCQuestionnaire,
    GeneralAMCQuestionnaireAttributes,
    GeneralAMCQuestionnaireBaseAttributes,
} from "../../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { getYesNoValueFromBoolean } from "../../../../domain/entities/amc-questionnaires/YesNoOption";
import { AMCQuestionnaireOptionsContextState } from "../../../contexts/amc-questionnaire-options-context";
import {
    FormFieldState,
    getAllFieldsFromSections,
    getBooleanFieldValue,
    getStringFieldValue,
} from "../../form/presentation-entities/FormFieldsState";
import { FormState } from "../../form/presentation-entities/FormState";
import { GeneralAMCQuestionnaireFormEntity } from "./presentation-entities/QuestionnaireFormEntity";

export function mapFormStateToGeneralAMCQuestionnaire(params: {
    formState: FormState;
    formEntity: GeneralAMCQuestionnaireFormEntity;
    orgUnitId: string;
    period: string;
    editMode: boolean;
    options: AMCQuestionnaireOptionsContextState;
}): GeneralAMCQuestionnaire {
    const { formState, formEntity, options, period, orgUnitId, editMode } = params;
    const baseAttributes = getGeneralAMCQuestionnaireBaseAttributes(formEntity, orgUnitId, period, editMode);

    const allFields: FormFieldState[] = getAllFieldsFromSections(formState.sections);

    const isSameAsLastYear = options.yesNoUnknownNAOptions.find(
        option => option.code === getStringFieldValue("sameAsLastYear", allFields)
    )?.code;
    const shortageInPublicSector = options.yesNoUnknownOptions.find(
        option => option.code === getStringFieldValue("shortageInPublicSector", allFields)
    )?.code;
    const detailOnShortageInPublicSector = getStringFieldValue("detailOnShortageInPublicSector", allFields);
    const shortageInPrivateSector = options.yesNoUnknownOptions.find(
        option => option.code === getStringFieldValue("shortageInPrivateSector", allFields)
    )?.code;
    const detailOnShortageInPrivateSector = getStringFieldValue("detailOnShortageInPrivateSector", allFields);
    const generalComments = getStringFieldValue("generalComments", allFields);
    const antibacterials = getYesNoValueFromBoolean(getBooleanFieldValue("antibacterials", allFields));
    const antifungals = getYesNoValueFromBoolean(getBooleanFieldValue("antifungals", allFields));
    const antivirals = getYesNoValueFromBoolean(getBooleanFieldValue("antivirals", allFields));
    const antituberculosis = getYesNoValueFromBoolean(getBooleanFieldValue("antituberculosis", allFields));
    const antimalaria = getYesNoValueFromBoolean(getBooleanFieldValue("antimalaria", allFields));

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
