import {
    GeneralAMCQuestionnaire,
    GeneralAMCQuestionnaireAttributes,
} from "../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { D2ProgramMetadata } from "./getAMCQuestionnaireProgramMetadata";

import { D2TrackedEntityInstanceToPost, AttributeToPost, D2TrackerEnrollmentToPost } from "../../../types/d2-api";
import { Future, FutureData } from "../../../domain/entities/Future";
import {
    AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID,
    AMR_TET_AMC_DQuestionnaire_TRACKED_ENTITY_TYPE_ID,
    codesByGeneralAMCQuestionnaire,
    GeneralAMCQuestionnaireCode,
    isStringInGeneralAMCQuestionnaireCodes,
} from "./AMCQuestionnaireConstants";
import { getISODateAsLocaleDateString, getIsoDateForPeriod } from "./dateTimeHelpers";
import { D2TrackedEntity } from "./D2Types";
import { Id } from "../../../domain/entities/Base";
import { yesNoUnknownNAOption } from "../../../domain/entities/amc-questionnaires/YesNoUnknownNAOption";
import { yesNoUnknownOption } from "../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import { yesNoOption } from "../../../domain/entities/amc-questionnaires/YesNoOption";

export function mapGeneralAMCQuestionnaireToTrackedEntity(
    generalAMCQuestionnaire: GeneralAMCQuestionnaire,
    programMetadata: D2ProgramMetadata
): FutureData<D2TrackedEntityInstanceToPost> {
    return getAttributesFromGeneralAMCQuestionnaire(generalAMCQuestionnaire, programMetadata).flatMap(
        (attributes: AttributeToPost[]) => {
            const isEditingTrackedEntity = generalAMCQuestionnaire.id !== "";

            if (isEditingTrackedEntity) {
                const trackedEntity: D2TrackedEntityInstanceToPost = {
                    trackedEntity: generalAMCQuestionnaire.id,
                    orgUnit: generalAMCQuestionnaire.orgUnitId,
                    trackedEntityType: AMR_TET_AMC_DQuestionnaire_TRACKED_ENTITY_TYPE_ID,
                    attributes: attributes,
                    enrollments: [],
                };

                return Future.success(trackedEntity);
            } else {
                const enrollment: D2TrackerEnrollmentToPost = {
                    trackedEntity: generalAMCQuestionnaire.id,
                    orgUnit: generalAMCQuestionnaire.orgUnitId,
                    program: AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID,
                    enrollment: "",
                    trackedEntityType: AMR_TET_AMC_DQuestionnaire_TRACKED_ENTITY_TYPE_ID,
                    attributes: attributes,
                    events: [],
                    enrolledAt: getIsoDateForPeriod(generalAMCQuestionnaire.period),
                    occurredAt: getIsoDateForPeriod(generalAMCQuestionnaire.period),
                    status: "ACTIVE",
                };

                const trackedEntity: D2TrackedEntityInstanceToPost = {
                    trackedEntity: generalAMCQuestionnaire.id,
                    orgUnit: generalAMCQuestionnaire.orgUnitId,
                    trackedEntityType: AMR_TET_AMC_DQuestionnaire_TRACKED_ENTITY_TYPE_ID,
                    attributes: attributes,
                    createdAt: getIsoDateForPeriod(generalAMCQuestionnaire.period),
                    updatedAt: getIsoDateForPeriod(generalAMCQuestionnaire.period),
                    enrollments: [enrollment],
                };

                return Future.success(trackedEntity);
            }
        }
    );
}

function getAttributesFromGeneralAMCQuestionnaire(
    generalAMCQuestionnaire: GeneralAMCQuestionnaire,
    programMetadata: D2ProgramMetadata
): FutureData<AttributeToPost[]> {
    const attributeValues: Record<GeneralAMCQuestionnaireCode, string> =
        getValueFromGeneralAMCQuestionnaire(generalAMCQuestionnaire);

    const programTrackedEntityAttributes = programMetadata.programTrackedEntityAttributes;
    const invalidAttribute = programTrackedEntityAttributes.find(
        attribute => !isStringInGeneralAMCQuestionnaireCodes(attribute.trackedEntityAttribute.code)
    );

    if (invalidAttribute) {
        return Future.error(
            `Attribute code not found in GeneralAMCQuestionnaireCodes: ${invalidAttribute.trackedEntityAttribute.code}`
        );
    }

    const attributes: AttributeToPost[] = programTrackedEntityAttributes.reduce(
        (acc: AttributeToPost[], attribute): AttributeToPost[] => {
            if (isStringInGeneralAMCQuestionnaireCodes(attribute.trackedEntityAttribute.code)) {
                const typedCode: GeneralAMCQuestionnaireCode = attribute.trackedEntityAttribute.code;
                const attributeValue = attributeValues[typedCode];
                return attributeValue !== undefined
                    ? [
                          ...acc,
                          {
                              attribute: attribute.trackedEntityAttribute.id,
                              value: attributeValue,
                          },
                      ]
                    : acc;
            } else {
                return acc;
            }
        },
        []
    );
    return Future.success(attributes);
}

function getValueFromGeneralAMCQuestionnaire(
    generalAMCQuestionnaire: GeneralAMCQuestionnaire
): Record<GeneralAMCQuestionnaireCode, string> {
    return {
        AMR_GLASS_AMC_TEA_SAME_PREV_YEAR: generalAMCQuestionnaire.isSameAsLastYear,
        AMR_GLASS_AMC_TEA_SAME_DESC: generalAMCQuestionnaire.detailOnSameAsLast ?? "",
        AMR_GLASS_AMC_TEA_SHORTAGE_PUB: generalAMCQuestionnaire.shortageInPublicSector,
        AMR_GLASS_AMC_TEA_SHORTAGE_PUB_DESCR: generalAMCQuestionnaire.detailOnShortageInPublicSector ?? "",
        AMR_GLASS_AMC_TEA_SHORTAGE_PRV: generalAMCQuestionnaire.shortageInPrivateSector,
        AMR_GLASS_AMC_TEA_SHORTAGE_PRV_DESCR: generalAMCQuestionnaire.detailOnShortageInPrivateSector ?? "",
        AMR_GLASS_AMC_TEA_GEN_COMMENTS: generalAMCQuestionnaire.generalComments ?? "",
        AMR_GLASS_AMC_TEA_ATB: generalAMCQuestionnaire.antibiotics,
        AMR_GLASS_AMC_TEA_ATF: generalAMCQuestionnaire.antifungals,
        AMR_GLASS_AMC_TEA_ATV: generalAMCQuestionnaire.antivirals,
        AMR_GLASS_AMC_TEA_ATT: generalAMCQuestionnaire.antituberculosis,
        AMR_GLASS_AMC_TEA_ATM: generalAMCQuestionnaire.antimalaria,
    };
}

export function mapTrackedEntityAttributesToGeneralAMCQuestionnaire(
    trackedEntity: D2TrackedEntity,
    orgUnitId: Id,
    period: string
): FutureData<GeneralAMCQuestionnaire> {
    if (!trackedEntity.trackedEntity) {
        return Future.error("Tracked entity not found");
    }

    const fromMap = (key: keyof typeof codesByGeneralAMCQuestionnaire) => getValueFromMap(key, trackedEntity);

    const isSameAsLastYear = yesNoUnknownNAOption.getSafeValue(fromMap("isSameAsLastYear"));
    const shortageInPublicSector = yesNoUnknownOption.getSafeValue(fromMap("shortageInPublicSector"));
    const shortageInPrivateSector = yesNoUnknownOption.getSafeValue(fromMap("shortageInPrivateSector"));
    const antibiotics = yesNoOption.getSafeValue(fromMap("antibiotics"));
    const antifungals = yesNoOption.getSafeValue(fromMap("antifungals"));
    const antivirals = yesNoOption.getSafeValue(fromMap("antivirals"));
    const antituberculosis = yesNoOption.getSafeValue(fromMap("antituberculosis"));
    const antimalaria = yesNoOption.getSafeValue(fromMap("antimalaria"));

    if (
        !isSameAsLastYear ||
        !shortageInPublicSector ||
        !shortageInPrivateSector ||
        !antibiotics ||
        !antifungals ||
        !antivirals ||
        !antituberculosis ||
        !antimalaria
    ) {
        return Future.error("Missing required General AMC Questionnaire attributes");
    }

    const generalAMCQuestionnaireAttributes: GeneralAMCQuestionnaireAttributes = {
        id: trackedEntity.trackedEntity,
        orgUnitId: orgUnitId,
        period: period,
        status: trackedEntity.enrollments?.[0]?.status ?? "ACTIVE",
        created: trackedEntity.createdAt ? getISODateAsLocaleDateString(trackedEntity.createdAt) : undefined,
        lastUpdated: trackedEntity.updatedAt ? getISODateAsLocaleDateString(trackedEntity.updatedAt) : undefined,
        isSameAsLastYear: isSameAsLastYear,
        detailOnSameAsLast: fromMap("detailOnSameAsLast"),
        shortageInPublicSector: shortageInPublicSector,
        detailOnShortageInPublicSector: fromMap("detailOnShortageInPublicSector"),
        shortageInPrivateSector: shortageInPrivateSector,
        detailOnShortageInPrivateSector: fromMap("detailOnShortageInPrivateSector"),
        generalComments: fromMap("generalComments"),
        antibiotics: antibiotics,
        antifungals: antifungals,
        antivirals: antivirals,
        antituberculosis: antituberculosis,
        antimalaria: antimalaria,
    };

    const generalAMCQuestionnaire = new GeneralAMCQuestionnaire(generalAMCQuestionnaireAttributes);

    return Future.success(generalAMCQuestionnaire);
}

function getValueFromMap(key: keyof typeof codesByGeneralAMCQuestionnaire, trackedEntity: D2TrackedEntity): string {
    return trackedEntity.attributes?.find(a => a.code === codesByGeneralAMCQuestionnaire[key])?.value ?? "";
}
