import {
    Enrollment,
    EnrollmentAttribute,
    EnrollmentEvent,
    TrackedEntity,
    TrackerPostResponse,
} from "../../../../data/repositories/TrackerDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { RISIndividualData } from "../../../entities/data-entry/amr-i-external/RISIndividualData";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { RISIndividualDataRepository } from "../../../repositories/data-entry/RISIndividualDataRepository";
import { getStringFromFile } from "../utils/fileToString";

const AMRIProgramID = "mMAj6Gofe49";
const AMR_GLASS_AMR_TET_PATIENT = "CcgnfemKr5U";
const AMRDataProgramStageId = "KCmWZD8qoAk";
export class ImportRISIndividualFile {
    constructor(
        private risIndividualRepository: RISIndividualDataRepository,
        private trackerRepository: TrackerRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository
    ) {}

    public importRISIndividualFile(
        inputFile: File,
        action: ImportStrategy,
        orgUnit: string,
        period: string,
        eventListId: string | undefined,
        program:
            | {
                  id: string;
                  programStageId: string;
              }
            | undefined
    ): FutureData<ImportSummary> {
        if (action === "CREATE_AND_UPDATE") {
            return this.risIndividualRepository.get(inputFile).flatMap(risIndividualDataItems => {
                console.debug(risIndividualDataItems, action, orgUnit, period);
                //TO DO : Add Validation

                //Import RIS data
                const AMRIProgramIDl = program ? program.id : AMRIProgramID;
                const AMRDataProgramStageIdl = program ? program.programStageId : AMRDataProgramStageId;

                return this.mapIndividualDataItemsToEntities(
                    risIndividualDataItems,
                    orgUnit,
                    AMRIProgramIDl,
                    AMRDataProgramStageIdl
                ).flatMap(entities => {
                    return this.trackerRepository.import({ trackedEntities: entities }, action).flatMap(response => {
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

                            return this.glassDocumentsRepository.save(enrollmentIdsListFile, "AMR").flatMap(fileId => {
                                return this.glassUploadsRepository
                                    .setEventListFileId(primaryUploadId, fileId)
                                    .flatMap(() => {
                                        console.debug(`Updated upload datastore object with entityListFileId`);
                                        return Future.success(summary);
                                    });
                            });
                        } else {
                            return Future.success(summary);
                        }
                    });
                });
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

    private mapIndividualDataItemsToEntities(
        individualDataItems: RISIndividualData[],
        orgUnit: string,
        AMRIProgramIDl: string,
        AMRDataProgramStageIdl: string
    ): FutureData<TrackedEntity[]> {
        return this.trackerRepository
            .getAMRIProgramMetadata(AMRIProgramIDl, AMRDataProgramStageIdl)
            .flatMap(metadata => {
                console.debug(metadata);
                const trackedEntities = individualDataItems.map(dataItem => {
                    const attributes: EnrollmentAttribute[] = metadata.programAttributes.map(
                        (attr: { id: string; name: string; code: string }) => {
                            return {
                                attribute: attr.id,
                                // @ts-ignore
                                value: Object.keys(dataItem).includes(attr.code) ? dataItem[attr.code] : "",
                            };
                        }
                    );
                    const AMRDataStage: { dataElement: string; value: string | number }[] =
                        metadata.programStageDataElements.map((de: { id: string; name: string; code: string }) => {
                            console.debug(de);
                            return {
                                dataElement: de.id,
                                // @ts-ignore
                                value: Object.keys(dataItem).includes(de.code) ? dataItem[de.code] : "",
                            };
                        });

                    const events: EnrollmentEvent[] = [
                        {
                            program: AMRIProgramIDl,
                            event: "",
                            programStage: AMRDataProgramStageIdl,
                            orgUnit,
                            dataValues: AMRDataStage,
                            occurredAt: new Date().getTime().toString(),
                        },
                    ];
                    const enrollments: Enrollment[] = [
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
                        },
                    ];

                    const entity: TrackedEntity = {
                        orgUnit,
                        trackedEntity: "",
                        trackedEntityType: AMR_GLASS_AMR_TET_PATIENT,
                        enrollments: enrollments,
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
            response.validationReport.errorReports.map(be => {
                return be.message;
            })
        );

        const nonBlockingErrors = _.countBy(
            response.validationReport.warningReports.map(nbe => {
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
