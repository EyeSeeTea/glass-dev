import i18n from "@eyeseetea/d2-ui-components/locales";
import { Future, FutureData } from "../../../entities/Future";
import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { RISIndividualFunghiData } from "../../../entities/data-entry/amr-individual-funghi-external/RISIndividualFunghiData";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { RISIndividualFunghiDataRepository } from "../../../repositories/data-entry/RISIndividualFunghiDataRepository";
import { getStringFromFile } from "../utils/fileToString";
import { TrackerPostResponse } from "@eyeseetea/d2-api/api/tracker";
import { D2TrackerTrackedEntity as TrackedEntity } from "@eyeseetea/d2-api/api/trackerTrackedEntities";
import { D2TrackerEnrollment, D2TrackerEnrollmentAttribute } from "@eyeseetea/d2-api/api/trackerEnrollments";
import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";

const AMRIProgramID = "mMAj6Gofe49";
const AMR_GLASS_AMR_TET_PATIENT = "CcgnfemKr5U";
const AMRDataProgramStageId = "KCmWZD8qoAk";
const AMRCandidaProgramStageId = "ysGSonDq9Bc";

const PATIENT_COUNTER_ID = "uSGcLbT5gJJ";
const PATIENT_ID = "qKWPfeSgTnc";

export class ImportRISIndividualFunghiFile {
    constructor(
        private risIndividualFunghiRepository: RISIndividualFunghiDataRepository,
        private trackerRepository: TrackerRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository
    ) {}

    public importRISIndividualFunghiFile(
        inputFile: File,
        action: ImportStrategy,
        orgUnit: string,
        countryCode: string,
        period: string,
        eventListId: string | undefined,
        program:
            | {
                  id: string;
                  programStageId: string;
              }
            | undefined,
        moduleName: string
    ): FutureData<ImportSummary> {
        if (action === "CREATE_AND_UPDATE") {
            return this.risIndividualFunghiRepository
                .get(moduleName, inputFile)
                .flatMap(risIndividualFunghiDataItems => {
                    return this.validateDataItems(risIndividualFunghiDataItems, countryCode, period).flatMap(
                        validationSummary => {
                            //If there are blocking errors on custom validation, do not import. Return immediately.
                            if (validationSummary.blockingErrors.length > 0) {
                                return Future.success(validationSummary);
                            }
                            //Import RIS data
                            const AMRIProgramIDl = program ? program.id : AMRIProgramID;
                            //const AMRDataProgramStageIdl = program ? program.programStageId : AMRDataProgramStageId;
                            const AMRDataProgramStageIdl = () => {
                                if (program) {
                                    return program.programStageId;
                                } else {
                                    return moduleName === "AMR - Individual"
                                        ? AMRDataProgramStageId
                                        : AMRCandidaProgramStageId;
                                }
                            };

                            return this.mapIndividualFunghiDataItemsToEntities(
                                risIndividualFunghiDataItems,
                                orgUnit,
                                AMRIProgramIDl,
                                AMRDataProgramStageIdl(),
                                countryCode
                            ).flatMap(entities => {
                                return this.trackerRepository
                                    .import({ trackedEntities: entities }, action)
                                    .flatMap(response => {
                                        const { summary, entityIdsList } = this.mapResponseToImportSummary(response);

                                        const primaryUploadId = localStorage.getItem("primaryUploadId");
                                        if (entityIdsList.length > 0 && primaryUploadId) {
                                            //Enrollments were imported successfully, so create and uplaod a file with enrollments ids
                                            // and associate it with the upload datastore object
                                            const enrollmentIdListBlob = new Blob([JSON.stringify(entityIdsList)], {
                                                type: "text/plain",
                                            });

                                            const enrollmentIdsListFile = new File(
                                                [enrollmentIdListBlob],
                                                `${primaryUploadId}_enrollmentIdsFile`
                                            );

                                            return this.glassDocumentsRepository
                                                .save(enrollmentIdsListFile, "AMR")
                                                .flatMap(fileId => {
                                                    return this.glassUploadsRepository
                                                        .setEventListFileId(primaryUploadId, fileId)
                                                        .flatMap(() => {
                                                            return Future.success(summary);
                                                        });
                                                });
                                        } else {
                                            return Future.success(summary);
                                        }
                                    });
                            });
                        }
                    );
                });
        } else if (action === "DELETE") {
            if (eventListId) {
                return this.glassDocumentsRepository.download(eventListId).flatMap(file => {
                    return Future.fromPromise(getStringFromFile(file)).flatMap(_enrollments => {
                        const enrollmemtIdList: [] = JSON.parse(_enrollments);
                        const trackedEntities = enrollmemtIdList.map(id => {
                            const trackedEntity: TrackedEntity = {
                                orgUnit,
                                trackedEntity: id,
                                trackedEntityType: AMR_GLASS_AMR_TET_PATIENT,
                            };

                            return trackedEntity;
                        });

                        return this.trackerRepository
                            .import({ trackedEntities: trackedEntities }, action)
                            .flatMap(response => {
                                const { summary } = this.mapResponseToImportSummary(response);
                                return Future.success(summary);
                            });
                    });
                });
            } else {
                //No enrollments were created during import, so no events to delete.
                const summary: ImportSummary = {
                    status: "SUCCESS",
                    importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
                    nonBlockingErrors: [],
                    blockingErrors: [],
                };
                return Future.success(summary);
            }
        } else {
            return Future.error("Unknown action type");
        }
    }

    private validateDataItems(
        risIndividualFunghiDataItems: RISIndividualFunghiData[],
        orgUnit: string,
        period: string
    ): FutureData<ImportSummary> {
        const orgUnitErrors = this.checkCountry(risIndividualFunghiDataItems, orgUnit);
        const periodErrors = this.checkPeriod(risIndividualFunghiDataItems, period);
        const summary: ImportSummary = {
            status: "ERROR",
            importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
            nonBlockingErrors: [],
            blockingErrors: [...orgUnitErrors, ...periodErrors],
        };
        return Future.success(summary);
    }

    private checkCountry(risIndividualFunghiDataItems: RISIndividualFunghiData[], orgUnit: string): ConsistencyError[] {
        const errors = _(
            risIndividualFunghiDataItems.map((dataItem, index) => {
                if (dataItem.COUNTRY !== orgUnit) {
                    return {
                        error: i18n.t(
                            `Country is different: Selected Data Submission Country : ${orgUnit}, Country in file: ${dataItem.COUNTRY}`
                        ),
                        line: index,
                    };
                }
            })
        )
            .omitBy(_.isNil)
            .groupBy(error => error?.error)
            .mapValues(value => value.map(el => el?.line || 0))
            .value();

        return Object.keys(errors).map(error => ({
            error: error,
            count: errors[error]?.length || 0,
            lines: errors[error] || [],
        }));
    }
    private checkPeriod(risIndividualFunghiDataItems: RISIndividualFunghiData[], period: string): ConsistencyError[] {
        const errors = _(
            risIndividualFunghiDataItems.map((dataItem, index) => {
                if (dataItem.YEAR !== parseInt(period)) {
                    return {
                        error: i18n.t(
                            `Year is different: Selected Data Submission Country : ${period}, Country in file: ${dataItem.YEAR}`
                        ),
                        line: index,
                    };
                }
            })
        )
            .omitBy(_.isNil)
            .groupBy(error => error?.error)
            .mapValues(value => value.map(el => el?.line || 0))
            .value();

        return Object.keys(errors).map(error => ({
            error: error,
            count: errors[error]?.length || 0,
            lines: errors[error] || [],
        }));
    }

    private mapIndividualFunghiDataItemsToEntities(
        individualFunghiDataItems: RISIndividualFunghiData[],
        orgUnit: string,
        AMRIProgramIDl: string,
        AMRDataProgramStageIdl: string,
        countryCode: string
    ): FutureData<TrackedEntity[]> {
        return this.trackerRepository
            .getAMRIProgramMetadata(AMRIProgramIDl, AMRDataProgramStageIdl)
            .flatMap(metadata => {
                const trackedEntities = individualFunghiDataItems.map(dataItem => {
                    const attributes: D2TrackerEnrollmentAttribute[] = metadata.programAttributes.map(
                        (attr: { id: string; name: string; code: string }) => {
                            return {
                                attribute: attr.id,
                                // @ts-ignore
                                value: Object.keys(dataItem).includes(attr.code) ? dataItem[attr.code] : "",
                            };
                        }
                    );
                    const AMRDataStage: { dataElement: string; value: string }[] =
                        metadata.programStageDataElements.map((de: { id: string; name: string; code: string }) => {
                            return {
                                dataElement: de.id,
                                // @ts-ignore
                                value: Object.keys(dataItem).includes(de.code) ? dataItem[de.code] : "",
                            };
                        });

                    const events: D2TrackerEvent[] = [
                        {
                            program: AMRIProgramIDl,
                            event: "",
                            programStage: AMRDataProgramStageIdl,
                            orgUnit,
                            dataValues: AMRDataStage,
                            occurredAt: new Date().getTime().toString(),
                            status: "ACTIVE",
                        },
                    ];
                    const enrollments: D2TrackerEnrollment[] = [
                        {
                            orgUnit,
                            program: AMRIProgramIDl,
                            enrollment: "",
                            trackedEntityType: AMR_GLASS_AMR_TET_PATIENT,
                            notes: [],
                            relationships: [],
                            attributes: attributes,
                            events: events,
                            enrolledAt: new Date().getTime().toString(),
                            occurredAt: new Date().getTime().toString(),
                            createdAt: new Date().getTime().toString(),
                            createdAtClient: new Date().getTime().toString(),
                            updatedAt: new Date().getTime().toString(),
                            updatedAtClient: new Date().getTime().toString(),
                            status: "ACTIVE",
                            orgUnitName: countryCode,
                            followUp: false,
                            deleted: false,
                            storedBy: "",
                        },
                    ];

                    const entity: TrackedEntity = {
                        orgUnit,
                        trackedEntity: "",
                        trackedEntityType: AMR_GLASS_AMR_TET_PATIENT,
                        enrollments: enrollments,
                        attributes: [
                            {
                                attribute: PATIENT_COUNTER_ID,
                                value:
                                    attributes.find(at => at.attribute === PATIENT_COUNTER_ID)?.value.toString() ?? "",
                            },
                            {
                                attribute: PATIENT_ID,
                                value: attributes.find(at => at.attribute === PATIENT_ID)?.value.toString() ?? "",
                            },
                        ],
                    };
                    return entity;
                });
                return Future.success(trackedEntities);
            });
    }

    private mapResponseToImportSummary(response: TrackerPostResponse): {
        summary: ImportSummary;
        entityIdsList: string[];
    } {
        const blockingErrors = _.countBy(
            response.validationReport?.errorReports.map(be => {
                return be.message;
            })
        );

        const nonBlockingErrors = _.countBy(
            response.validationReport?.warningReports.map(nbe => {
                return nbe.message;
            })
        );

        const summary: ImportSummary = {
            status: response.status === "OK" ? "SUCCESS" : response.status,
            importCount: {
                imported: response.stats.created,
                updated: response.stats.updated,
                ignored: response.stats.ignored,
                deleted: response.stats.deleted,
            },
            nonBlockingErrors: Object.entries(nonBlockingErrors).map(err => {
                return { error: err[0], count: err[1] };
            }),
            blockingErrors: Object.entries(blockingErrors).map(err => {
                return { error: err[0], count: err[1] };
            }),
            importTime: new Date(),
        };

        let entityListIds: string[] = [];
        if (response.status === "OK") {
            entityListIds = _.compact(
                response.bundleReport?.typeReportMap.TRACKED_ENTITY.objectReports.map(report => report.uid)
            );
        }

        return { summary, entityIdsList: entityListIds };
    }
}
