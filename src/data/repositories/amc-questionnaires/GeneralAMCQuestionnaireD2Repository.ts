import {
    GeneralAMCQuestionnaire,
    GeneralAMCQuestionnaireAttributes,
} from "../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { Id } from "../../../domain/entities/Base";
import { Future, FutureData } from "../../../domain/entities/Future";
import { GeneralAMCQuestionnaireRepository } from "../../../domain/repositories/amc-questionnaires/GeneralAMCQuestionnaireRepository";
import {
    D2Api,
    SelectedPick,
    D2TrackerTrackedEntitySchema,
    D2TrackedEntityInstanceToPost,
    AttributeToPost,
    D2TrackerEnrollmentToPost,
} from "../../../types/d2-api";
import { apiToFuture } from "../../../utils/futures";
import { assertOrError } from "../utils/AssertOrError";
import { getSafeYesNoValue } from "../../../domain/entities/amc-questionnaires/YesNoOption";
import { getSafeYesNoUnknownNAValue } from "../../../domain/entities/amc-questionnaires/YesNoUnknownNAOption";
import { getSafeYesNoUnknownValue } from "../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import {
    AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID,
    AMR_TET_AMC_DQuestionnaire_TRACKED_ENTITY_TYPE_ID,
    codesByGeneralAMCQuestionnaire,
    GeneralAMCQuestionnaireCode,
    isStringInGeneralAMCQuestionnaireCodes,
} from "./AMCQuestionnaireConstants";
import { D2ProgramMetadata, getAMCQuestionnaireProgramMetadata } from "./getAMCQuestionnaireProgramMetadata";
import { getCurrentTimeString, getISODateAsLocaleDateString } from "./dateTimeHelpers";
import { importApiTracker } from "../utils/importApiTracker";

export class GeneralAMCQuestionnaireD2Repository implements GeneralAMCQuestionnaireRepository {
    constructor(private api: D2Api) {}

    public get(id: Id, orgUnitId: Id, period: string): FutureData<GeneralAMCQuestionnaire> {
        return this.getTracketEntityById(id, orgUnitId, period).flatMap((trackedEntity: D2TrackedEntity) => {
            return this.mapTrackedEntityAttributesToGeneralAMCQuestionnaire(trackedEntity, orgUnitId, period).flatMap(
                generalAMCQuestionnaire => {
                    if (!generalAMCQuestionnaire) {
                        return Future.error("General AMC Questionnaire not found");
                    }

                    return Future.success(generalAMCQuestionnaire);
                }
            );
        });
    }

    public save(generalAMCQuestionnaire: GeneralAMCQuestionnaire): FutureData<Id> {
        return getAMCQuestionnaireProgramMetadata(this.api).flatMap((programMetadata: D2ProgramMetadata) => {
            return this.mapGeneralAMCQuestionnaireToTrackedEntity(generalAMCQuestionnaire, programMetadata).flatMap(
                trackedEntity => {
                    return importApiTracker(
                        this.api,
                        { trackedEntities: [trackedEntity] },
                        "CREATE_AND_UPDATE"
                    ).flatMap(saveResponse => {
                        const generalAMCQuestionnaireId =
                            saveResponse.bundleReport.typeReportMap.TRACKED_ENTITY.objectReports[0]?.uid;

                        if (saveResponse.status === "ERROR" || !generalAMCQuestionnaireId) {
                            return Future.error(
                                `Error saving general AMC questionnaire: ${saveResponse.validationReport.errorReports
                                    .map(e => e.message)
                                    .join(", ")}`
                            );
                        } else {
                            return Future.success(generalAMCQuestionnaireId);
                        }
                    });
                }
            );
        });
    }

    private getTracketEntityById(id: Id, orgUnitId: Id, period: string): FutureData<D2TrackedEntity> {
        const enrollmentEnrolledAfter = `${period}-01-01`;
        const enrollmentEnrolledBefore = `${period}-12-31`;
        return apiToFuture(
            this.api.tracker.trackedEntities.get({
                program: AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID,
                orgUnit: orgUnitId,
                ouMode: "SELECTED",
                trackedEntity: id,
                enrollmentEnrolledAfter: enrollmentEnrolledAfter,
                enrollmentEnrolledBefore: enrollmentEnrolledBefore,
                fields: trackedEntitiesFields,
            })
        ).flatMap(response => assertOrError(response.instances[0], "General AMC Questionnaire"));
    }

    private mapTrackedEntityAttributesToGeneralAMCQuestionnaire(
        trackedEntity: D2TrackedEntity,
        orgUnitId: Id,
        period: string
    ): FutureData<GeneralAMCQuestionnaire> {
        if (!trackedEntity.trackedEntity) {
            return Future.error("Tracked entity not found");
        }

        const fromMap = (key: keyof typeof codesByGeneralAMCQuestionnaire) => getValueFromMap(key, trackedEntity);

        const isSameAsLastYear = getSafeYesNoUnknownNAValue(fromMap("isSameAsLastYear"));
        const shortageInPublicSector = getSafeYesNoUnknownValue(fromMap("shortageInPublicSector"));
        const shortageInPrivateSector = getSafeYesNoUnknownValue(fromMap("shortageInPrivateSector"));
        const antibacterials = getSafeYesNoValue(fromMap("antibacterials"));
        const antifungals = getSafeYesNoValue(fromMap("antifungals"));
        const antivirals = getSafeYesNoValue(fromMap("antivirals"));
        const antituberculosis = getSafeYesNoValue(fromMap("antituberculosis"));
        const antimalaria = getSafeYesNoValue(fromMap("antimalaria"));

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
            shortageInPublicSector: shortageInPublicSector,
            detailOnShortageInPublicSector: fromMap("detailOnShortageInPublicSector"),
            shortageInPrivateSector: shortageInPrivateSector,
            detailOnShortageInPrivateSector: fromMap("detailOnShortageInPrivateSector"),
            generalComments: fromMap("generalComments"),
            antibacterials: antibacterials,
            antifungals: antifungals,
            antivirals: antivirals,
            antituberculosis: antituberculosis,
            antimalaria: antimalaria,
        };

        const generalAMCQuestionnaire = new GeneralAMCQuestionnaire(generalAMCQuestionnaireAttributes);

        return Future.success(generalAMCQuestionnaire);
    }

    private mapGeneralAMCQuestionnaireToTrackedEntity(
        generalAMCQuestionnaire: GeneralAMCQuestionnaire,
        programMetadata: D2ProgramMetadata
    ): FutureData<D2TrackedEntityInstanceToPost> {
        return this.getAttributesFromGeneralAMCQuestionnaire(generalAMCQuestionnaire, programMetadata).flatMap(
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
                        enrolledAt: getCurrentTimeString(),
                        occurredAt: getCurrentTimeString(),
                        status: "ACTIVE",
                    };

                    const trackedEntity: D2TrackedEntityInstanceToPost = {
                        trackedEntity: generalAMCQuestionnaire.id,
                        orgUnit: generalAMCQuestionnaire.orgUnitId,
                        trackedEntityType: AMR_TET_AMC_DQuestionnaire_TRACKED_ENTITY_TYPE_ID,
                        attributes: attributes,
                        createdAt: getCurrentTimeString(),
                        updatedAt: getCurrentTimeString(),
                        enrollments: [enrollment],
                    };

                    return Future.success(trackedEntity);
                }
            }
        );
    }

    private getAttributesFromGeneralAMCQuestionnaire(
        generalAMCQuestionnaire: GeneralAMCQuestionnaire,
        programMetadata: D2ProgramMetadata
    ): FutureData<AttributeToPost[]> {
        const attributeValues: Record<GeneralAMCQuestionnaireCode, string> =
            this.getValueFromGeneralAMCQuestionnaire(generalAMCQuestionnaire);

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
                    return [
                        ...acc,
                        {
                            attribute: attribute.trackedEntityAttribute.id,
                            value: attributeValues[typedCode],
                        },
                    ];
                } else {
                    return acc;
                }
            },
            []
        );
        return Future.success(attributes);
    }

    private getValueFromGeneralAMCQuestionnaire(
        generalAMCQuestionnaire: GeneralAMCQuestionnaire
    ): Record<GeneralAMCQuestionnaireCode, string> {
        return {
            AMR_GLASS_AMC_TEA_SAME_PREV_YEAR: generalAMCQuestionnaire.isSameAsLastYear,
            AMR_GLASS_AMC_TEA_SHORTAGE_PUB: generalAMCQuestionnaire.shortageInPublicSector,
            AMR_GLASS_AMC_TEA_SHORTAGE_PUB_DESCR: generalAMCQuestionnaire.detailOnShortageInPublicSector ?? "",
            AMR_GLASS_AMC_TEA_SHORTAGE_PRV: generalAMCQuestionnaire.shortageInPrivateSector,
            AMR_GLASS_AMC_TEA_SHORTAGE_PRV_DESCR: generalAMCQuestionnaire.detailOnShortageInPrivateSector ?? "",
            AMR_GLASS_AMC_TEA_GEN_COMMENTS: generalAMCQuestionnaire.generalComments ?? "",
            AMR_GLASS_AMC_TEA_ATB: generalAMCQuestionnaire.antibacterials,
            AMR_GLASS_AMC_TEA_ATF: generalAMCQuestionnaire.antifungals,
            AMR_GLASS_AMC_TEA_ATV: generalAMCQuestionnaire.antivirals,
            AMR_GLASS_AMC_TEA_ATT: generalAMCQuestionnaire.antituberculosis,
            AMR_GLASS_AMC_TEA_ATM: generalAMCQuestionnaire.antimalaria,
        };
    }
}

function getValueFromMap(key: keyof typeof codesByGeneralAMCQuestionnaire, trackedEntity: D2TrackedEntity): string {
    return trackedEntity.attributes?.find(a => a.code === codesByGeneralAMCQuestionnaire[key])?.value ?? "";
}

const trackedEntitiesFields = {
    orgUnit: true,
    trackedEntity: true,
    updatedAt: true,
    createdAt: true,
    enrollments: {
        enrollment: true,
        status: true,
        enrolledAt: true,
        occurredAt: true,
        events: {
            enrollment: true,
            event: true,
            occurredAt: true,
            orgUnit: true,
            program: true,
            programStage: true,
            dataValues: {
                dataElement: true,
                value: true,
            },
        },
    },
    attributes: true,
} as const;

type D2TrackedEntity = SelectedPick<D2TrackerTrackedEntitySchema, typeof trackedEntitiesFields>;
