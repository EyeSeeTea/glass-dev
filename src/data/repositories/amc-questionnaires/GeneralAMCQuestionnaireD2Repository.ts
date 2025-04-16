import moment from "moment";
import {
    GeneralAMCQuestionnaire,
    GeneralAMCQuestionnaireAttributes,
} from "../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { Id } from "../../../domain/entities/Base";
import { Future, FutureData } from "../../../domain/entities/Future";
import { GeneralAMCQuestionnaireRepository } from "../../../domain/repositories/amc-questionnaires/GeneralAMCQuestionnaireRepository";
import { D2Api, SelectedPick, D2TrackerTrackedEntitySchema } from "../../../types/d2-api";
import { apiToFuture } from "../../../utils/futures";
import { assertOrError } from "../utils/AssertOrError";
import { getSafeYesNoValue } from "../../../domain/entities/amc-questionnaires/YesNoOption";
import { getSafeYesNoUnknownNAValue } from "../../../domain/entities/amc-questionnaires/YesNoUnknownNAOption";
import { getSafeYesNoUnknownValue } from "../../../domain/entities/amc-questionnaires/YesNoUnknownOption";

export const AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID = "f9Jl9O4CYZf";

export const generalAMCQuestionnaireCodes = {
    isSameAsLastYear: "AMR_GLASS_AMC_TEA_SAME_PREV_YEAR",
    shortageInPublicSector: "AMR_GLASS_AMC_TEA_SHORTAGE_PUB",
    detailOnShortageInPublicSector: "AMR_GLASS_AMC_TEA_SHORTAGE_PUB_DESCR",
    shortageInPrivateSector: "AMR_GLASS_AMC_TEA_SHORTAGE_PRV",
    detailOnShortageInPrivateSector: "AMR_GLASS_AMC_TEA_SHORTAGE_PRV_DESCR",
    generalComments: "AMR_GLASS_AMC_TEA_GEN_COMMENTS",
    antibacterials: "AMR_GLASS_AMC_TEA_ATB",
    antifungals: "AMR_GLASS_AMC_TEA_ATF",
    antivirals: "AMR_GLASS_AMC_TEA_ATV",
    antituberculosis: "AMR_GLASS_AMC_TEA_ATT",
    antimalaria: "AMR_GLASS_AMC_TEA_ATM",
} as const;

export class GeneralAMCQuestionnaireD2Repository implements GeneralAMCQuestionnaireRepository {
    constructor(private api: D2Api) {}

    public get(id: Id, orgUnitId: Id, period: string): FutureData<GeneralAMCQuestionnaire> {
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
        )
            .flatMap(response => assertOrError(response.instances[0], "General AMC Questionnaire"))
            .flatMap(trackedEntity => {
                const generalAMCQuestionnaire = this.mapTrackedEntityAttributesToGeneralAMCQuestionnaire(
                    trackedEntity,
                    orgUnitId,
                    period
                );
                if (!generalAMCQuestionnaire) {
                    return Future.error("General AMC Questionnaire not found");
                }

                return generalAMCQuestionnaire;
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

        const fromMap = (key: keyof typeof generalAMCQuestionnaireCodes) => getValueFromMap(key, trackedEntity);

        const isSameAsLastYear = getSafeYesNoUnknownNAValue(fromMap("isSameAsLastYear"));
        const shortageInPublicSector = getSafeYesNoUnknownValue(fromMap("shortageInPublicSector"));
        const shortageInPrivateSector = getSafeYesNoUnknownValue(fromMap("shortageInPrivateSector"));
        const antibacterials = getSafeYesNoValue(mapYesNoNumberOptionsToString(fromMap("antibacterials")));
        const antifungals = getSafeYesNoValue(mapYesNoNumberOptionsToString(fromMap("antifungals")));
        const antivirals = getSafeYesNoValue(mapYesNoNumberOptionsToString(fromMap("antivirals")));
        const antituberculosis = getSafeYesNoValue(mapYesNoNumberOptionsToString(fromMap("antituberculosis")));
        const antimalaria = getSafeYesNoValue(mapYesNoNumberOptionsToString(fromMap("antimalaria")));

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

        const generalAMCQuestionnaireValidation = GeneralAMCQuestionnaire.validateAndCreate(
            generalAMCQuestionnaireAttributes
        );
        const validGeneralAMCQuestionnaire = generalAMCQuestionnaireValidation.match({
            error: () => undefined,
            success: generalAMCQuestionnaire => generalAMCQuestionnaire,
        });

        if (!validGeneralAMCQuestionnaire) {
            return Future.error("General AMC Questionnaire validation failed");
        }

        return Future.success(validGeneralAMCQuestionnaire);
    }
}

function getValueFromMap(key: keyof typeof generalAMCQuestionnaireCodes, trackedEntity: D2TrackedEntity): string {
    return trackedEntity.attributes?.find(a => a.code === generalAMCQuestionnaireCodes[key])?.value ?? "";
}

function getISODateAsLocaleDateString(date: string): Date {
    return moment.utc(date).local().toDate();
}

function mapYesNoNumberOptionsToString(value: string): string {
    return value === "1" ? "YES" : value === "0" ? "NO" : "";
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
        events: {
            event: true,
            occurredAt: true,
            dataValues: {
                dataElement: true,
                value: true,
            },
        },
    },
    attributes: true,
} as const;

type D2TrackedEntity = SelectedPick<D2TrackerTrackedEntitySchema, typeof trackedEntitiesFields>;
