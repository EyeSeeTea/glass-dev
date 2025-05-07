import {
    GeneralAMCQuestionnaire,
    GeneralAMCQuestionnaireAttributes,
} from "../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { Id } from "../../../domain/entities/Base";
import { Future, FutureData } from "../../../domain/entities/Future";
import { AMCQuestionnaireRepository } from "../../../domain/repositories/amc-questionnaires/AMCQuestionnaireRepository";
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
import { yesNoOption } from "../../../domain/entities/amc-questionnaires/YesNoOption";
import { yesNoUnknownNAOption } from "../../../domain/entities/amc-questionnaires/YesNoUnknownNAOption";
import { yesNoUnknownOption } from "../../../domain/entities/amc-questionnaires/YesNoUnknownOption";
import {
    AMR_GLASS_AMC_AM_CLASS_QUESTIONNAIRE_STAGE_ID,
    AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID,
    AMR_TET_AMC_DQuestionnaire_TRACKED_ENTITY_TYPE_ID,
    codesByGeneralAMCQuestionnaire,
    GeneralAMCQuestionnaireCode,
    isStringInGeneralAMCQuestionnaireCodes,
} from "./AMCQuestionnaireConstants";
import { D2ProgramMetadata, getAMCQuestionnaireProgramMetadata } from "./getAMCQuestionnaireProgramMetadata";
import { getISODateAsLocaleDateString, getIsoDateForPeriod } from "./dateTimeHelpers";
import { importApiTracker } from "../utils/importApiTracker";
import { Maybe } from "../../../types/utils";
import { AMCQuestionnaire } from "../../../domain/entities/amc-questionnaires/AMCQuestionnaire";
import { D2TrackerEventSchema } from "@eyeseetea/d2-api/api/trackerEvents";
import { AMClassAMCQuestionnaire } from "../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { getProgramStage } from "../utils/MetadataHelper";
import {
    mapAMClassAMCQuestionnaireToD2Event,
    mapD2EventToAMClassAMCQuestionnaire,
} from "./AMClassAMCQuestionnaireMapper";

export class AMCQuestionnaireD2Repository implements AMCQuestionnaireRepository {
    constructor(private api: D2Api) {}

    public getById(id: Id, orgUnitId: Id, period: string): FutureData<AMCQuestionnaire> {
        return this.get({ id: id, orgUnitId: orgUnitId, period: period }).flatMap(res =>
            assertOrError(res, "AMC Questionnaire not found")
        );
    }

    public getByOrgUnitAndPeriod(orgUnitId: Id, period: string): FutureData<Maybe<AMCQuestionnaire>> {
        return this.get({ orgUnitId: orgUnitId, period: period });
    }

    private getGeneralAMCQuestionnaire({
        id,
        orgUnitId,
        period,
    }: {
        id?: Id;
        orgUnitId: Id;
        period: string;
    }): FutureData<Maybe<GeneralAMCQuestionnaire>> {
        return this.getTrackedEntity({ id, orgUnitId, period }).flatMap(
            (maybeTrackedEntity: Maybe<D2TrackedEntity>) => {
                if (!maybeTrackedEntity) {
                    return Future.success(undefined);
                }

                return this.mapTrackedEntityAttributesToGeneralAMCQuestionnaire(
                    maybeTrackedEntity,
                    orgUnitId,
                    period
                ).flatMap(generalAMCQuestionnaire => {
                    if (!generalAMCQuestionnaire) {
                        return Future.error("General AMC Questionnaire not found");
                    }

                    return Future.success(generalAMCQuestionnaire);
                });
            }
        );
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

    public saveAmClassQuestionnaire(amClassAMCQuestionnaire: AMClassAMCQuestionnaire): FutureData<Id> {
        return getProgramStage(this.api, AMR_GLASS_AMC_AM_CLASS_QUESTIONNAIRE_STAGE_ID)
            .flatMap(programStageResponse =>
                assertOrError(programStageResponse.objects[0], "AM_CLASS_QUESTIONNAIRE Program stage not found")
            )
            .flatMap(programStage => {
                const d2Event = mapAMClassAMCQuestionnaireToD2Event(amClassAMCQuestionnaire, programStage);
                return importApiTracker(this.api, { events: [d2Event] }, "CREATE_AND_UPDATE").flatMap(saveResponse => {
                    const amClassAMCQuestionnaireId =
                        saveResponse.bundleReport.typeReportMap.EVENT.objectReports[0]?.uid;

                    if (saveResponse.status === "ERROR" || !amClassAMCQuestionnaireId) {
                        return Future.error(
                            `Error saving AM Class AMC questionnaire: ${saveResponse.validationReport.errorReports
                                .map(e => e.message)
                                .join(", ")}`
                        );
                    } else {
                        return Future.success(amClassAMCQuestionnaireId);
                    }
                });
            });
    }

    private get({
        id,
        orgUnitId,
        period,
    }: {
        id?: Id;
        orgUnitId: Id;
        period: string;
    }): FutureData<Maybe<AMCQuestionnaire>> {
        return this.getGeneralAMCQuestionnaire({ id, orgUnitId, period }).flatMap(
            (generalAMCQuestionnaire: Maybe<GeneralAMCQuestionnaire>) => {
                if (!generalAMCQuestionnaire) {
                    return Future.success(undefined);
                }
                return this.getAmClassQuestionnairesInAggregateRoot(generalAMCQuestionnaire.id, orgUnitId).map(
                    amClassAMCQuestionnaires => {
                        console.log("amClassQuestionnaires", amClassAMCQuestionnaires);
                        return new AMCQuestionnaire({
                            id: generalAMCQuestionnaire.id,
                            orgUnitId: orgUnitId,
                            period: period,
                            generalQuestionnaire: generalAMCQuestionnaire,
                            amClassQuestionnaires: amClassAMCQuestionnaires,
                        });
                    }
                );
            }
        );
    }

    private getAmClassQuestionnairesInAggregateRoot(id: Id, orgUnitId: Id): FutureData<AMClassAMCQuestionnaire[]> {
        return this.getEventsFromSection(id, orgUnitId, AMR_GLASS_AMC_AM_CLASS_QUESTIONNAIRE_STAGE_ID).map(events => {
            return events.map(event => mapD2EventToAMClassAMCQuestionnaire(event));
        });
    }

    private getEventsFromSection(trackedEntityId: Id, orgUnitId: Id, sectionId: Id): FutureData<D2Event[]> {
        return apiToFuture(
            this.api.tracker.events.get({
                program: AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID,
                orgUnit: orgUnitId,
                trackedEntity: trackedEntityId,
                programStage: sectionId,
                fields: eventFields,
            })
        ).flatMap(response => assertOrError(response.instances, "section events not found for " + sectionId));
    }

    private getTrackedEntity(options: { id?: Id; orgUnitId: Id; period: string }): FutureData<Maybe<D2TrackedEntity>> {
        const { id, orgUnitId, period } = options;
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
        ).flatMap(response => {
            if (response.instances.length === 0) {
                return Future.success(undefined);
            }

            const trackedEntity = response.instances[0];
            return Future.success(trackedEntity);
        });
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

        const isSameAsLastYear = yesNoUnknownNAOption.getSafeValue(fromMap("isSameAsLastYear"));
        const shortageInPublicSector = yesNoUnknownOption.getSafeValue(fromMap("shortageInPublicSector"));
        const shortageInPrivateSector = yesNoUnknownOption.getSafeValue(fromMap("shortageInPrivateSector"));
        const antibacterials = yesNoOption.getSafeValue(fromMap("antibacterials"));
        const antifungals = yesNoOption.getSafeValue(fromMap("antifungals"));
        const antivirals = yesNoOption.getSafeValue(fromMap("antivirals"));
        const antituberculosis = yesNoOption.getSafeValue(fromMap("antituberculosis"));
        const antimalaria = yesNoOption.getSafeValue(fromMap("antimalaria"));

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

const dataElementFields = {
    id: true,
    code: true,
    name: true,
} as const;

const eventFields = {
    dataValues: {
        dataElement: dataElementFields,
        value: true,
    },
    trackedEntity: true,
    event: true,
    updatedAt: true,
} as const;

export type D2Event = SelectedPick<D2TrackerEventSchema, typeof eventFields>;
