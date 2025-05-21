import { GeneralAMCQuestionnaire } from "../../../domain/entities/amc-questionnaires/GeneralAMCQuestionnaire";
import { Id } from "../../../domain/entities/Base";
import { Future, FutureData } from "../../../domain/entities/Future";
import { AMCQuestionnaireRepository } from "../../../domain/repositories/amc-questionnaires/AMCQuestionnaireRepository";
import { D2Api } from "../../../types/d2-api";
import { apiToFuture } from "../../../utils/futures";
import { assertOrError } from "../utils/AssertOrError";
import {
    AMR_GLASS_AMC_AM_CLASS_QUESTIONNAIRE_STAGE_ID,
    AMR_GLASS_AMC_AM_COMPONENT_QUESTIONNAIRE_STAGE_ID,
    AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID,
} from "./AMCQuestionnaireConstants";
import { D2ProgramMetadata, getAMCQuestionnaireProgramMetadata } from "./getAMCQuestionnaireProgramMetadata";
import { importApiTracker } from "../utils/importApiTracker";
import { Maybe } from "../../../types/utils";
import { AMCQuestionnaire } from "../../../domain/entities/amc-questionnaires/AMCQuestionnaire";
import { AMClassAMCQuestionnaire } from "../../../domain/entities/amc-questionnaires/AMClassAMCQuestionnaire";
import { getProgramStage } from "../utils/MetadataHelper";
import { D2Event, D2TrackedEntity, eventFields, trackedEntitiesFields } from "./D2Types";
import {
    mapAMClassAMCQuestionnaireToD2Event,
    mapD2EventToAMClassAMCQuestionnaire,
} from "./AMClassAMCQuestionnaireMapper";
import {
    mapGeneralAMCQuestionnaireToTrackedEntity,
    mapTrackedEntityAttributesToGeneralAMCQuestionnaire,
} from "./GeneralAMCQuestionnaireMapper";
import { ComponentAMCQuestionnaire } from "../../../domain/entities/amc-questionnaires/ComponentAMCQuestionnaire";
import {
    mapComponentAMCQuestionnaireToD2Event,
    mapD2EventToComponentAMCQuestionnaire,
} from "./ComponentAMCQuestionnaireMapper";
import { D2TrackerEventToPost } from "@eyeseetea/d2-api/api/trackerEvents";

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

                return mapTrackedEntityAttributesToGeneralAMCQuestionnaire(
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
            return mapGeneralAMCQuestionnaireToTrackedEntity(generalAMCQuestionnaire, programMetadata).flatMap(
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

    saveAMClassQuestionnaire(questionnaireId: Id, amClassAMCQuestionnaire: AMClassAMCQuestionnaire): FutureData<Id> {
        return Future.joinObj({
            programStageResponse: getProgramStage(this.api, AMR_GLASS_AMC_AM_CLASS_QUESTIONNAIRE_STAGE_ID),
            trackedEntity: this.getTrackedEntityById(questionnaireId),
        }).flatMap(({ programStageResponse, trackedEntity }) => {
            const programStage = programStageResponse.objects[0];
            if (!programStage) {
                return Future.error("Program stage not found");
            }
            if (!trackedEntity) {
                return Future.error("Tracked entity not found");
            }
            const d2Event = mapAMClassAMCQuestionnaireToD2Event(amClassAMCQuestionnaire, programStage, trackedEntity);
            return this.importQuestionnaireD2Event(d2Event, "AM Class AMC");
        });
    }

    saveComponentQuestionnaire(
        questionnaireId: Id,
        componentAMCQuestionnaire: ComponentAMCQuestionnaire
    ): FutureData<Id> {
        return Future.joinObj({
            programStageResponse: getProgramStage(this.api, AMR_GLASS_AMC_AM_COMPONENT_QUESTIONNAIRE_STAGE_ID),
            trackedEntity: this.getTrackedEntityById(questionnaireId),
        }).flatMap(({ programStageResponse, trackedEntity }) => {
            const programStage = programStageResponse.objects[0];
            if (!programStage) {
                return Future.error("Program stage not found");
            }
            if (!trackedEntity) {
                return Future.error("Tracked entity not found");
            }
            const d2Event = mapComponentAMCQuestionnaireToD2Event(
                componentAMCQuestionnaire,
                programStage,
                trackedEntity
            );
            return this.importQuestionnaireD2Event(d2Event, "Component AMC");
        });
    }

    private importQuestionnaireD2Event(event: D2TrackerEventToPost, questionnaireName: string): FutureData<Id> {
        return importApiTracker(this.api, { events: [event] }, "CREATE_AND_UPDATE").flatMap(saveResponse => {
            const questionnaireId = saveResponse?.bundleReport?.typeReportMap?.EVENT.objectReports[0]?.uid;

            if (saveResponse.status === "ERROR" || !questionnaireId) {
                return Future.error(
                    `Error saving ${questionnaireName} questionnaire: ${saveResponse.validationReport.errorReports
                        .map(e => e.message)
                        .join(", ")}`
                );
            } else {
                return Future.success(questionnaireId);
            }
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

                return Future.joinObj({
                    amClassAMCQuestionnaires: this.getAmClassQuestionnairesInAggregateRoot(
                        generalAMCQuestionnaire.id,
                        orgUnitId
                    ),
                    componentAMCQuestionnaires: this.getComponentQuestionnairesInAggregateRoot(
                        generalAMCQuestionnaire.id,
                        orgUnitId
                    ),
                }).map(({ amClassAMCQuestionnaires, componentAMCQuestionnaires }) => {
                    return new AMCQuestionnaire({
                        id: generalAMCQuestionnaire.id,
                        orgUnitId: orgUnitId,
                        period: period,
                        generalQuestionnaire: generalAMCQuestionnaire,
                        amClassQuestionnaires: amClassAMCQuestionnaires,
                        componentQuestionnaires: componentAMCQuestionnaires,
                    });
                });
            }
        );
    }

    private getAmClassQuestionnairesInAggregateRoot(id: Id, orgUnitId: Id): FutureData<AMClassAMCQuestionnaire[]> {
        return this.getEventsFromSection(id, orgUnitId, AMR_GLASS_AMC_AM_CLASS_QUESTIONNAIRE_STAGE_ID).map(events => {
            return events.map(event => mapD2EventToAMClassAMCQuestionnaire(event));
        });
    }

    private getComponentQuestionnairesInAggregateRoot(id: Id, orgUnitId: Id): FutureData<ComponentAMCQuestionnaire[]> {
        return this.getEventsFromSection(id, orgUnitId, AMR_GLASS_AMC_AM_COMPONENT_QUESTIONNAIRE_STAGE_ID).map(
            events => {
                return events.map(event => mapD2EventToComponentAMCQuestionnaire(event));
            }
        );
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

    private getTrackedEntityById(id: Id): FutureData<Maybe<D2TrackedEntity>> {
        return apiToFuture(
            this.api.tracker.trackedEntities.get({
                program: AMR_GLASS_PRO_AMC_DQ_PROGRAM_ID,
                ouMode: "ALL",
                trackedEntity: id,
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
}
