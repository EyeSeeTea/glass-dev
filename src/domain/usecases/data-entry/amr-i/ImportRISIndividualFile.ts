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
        eventListId: string | undefined
    ): FutureData<ImportSummary> {
        if (action === "CREATE_AND_UPDATE") {
            return this.risIndividualRepository.get(inputFile).flatMap(risIndividualDataItems => {
                console.debug(risIndividualDataItems, action, orgUnit, period);
                //TO DO : Add Validation

                //Import RIS data
                const entities = this.mapIndividualDataItemsToEntities(risIndividualDataItems, orgUnit);
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
        orgUnit: string
    ): TrackedEntity[] {
        return individualDataItems.map(dataItem => {
            const enrollments: Enrollment[] = [];
            const attributes: EnrollmentAttribute[] = [];
            const events: EnrollmentEvent[] = [];

            const sampleDate = new Date(dataItem.SAMPLE_DATE);
            const admissionDate = new Date(dataItem.DATEOFHOSPITALISATION_VISIT);

            attributes.push({ attribute: "a2WIeMjvfMw", value: dataItem.HOSPITALUNITTYPE });
            // attributes.push({ attribute: "qKWPfeSgTnc", value: dataItem.PATIENT_ID });
            attributes.push({ attribute: "uSGcLbT5gJJ", value: dataItem.PATIENTCOUNTER });
            attributes.push({ attribute: "C4c3vt3hMpy", value: dataItem.AGE });
            attributes.push({ attribute: "KmCUM2YyU45", value: dataItem.GENDER });
            attributes.push({ attribute: "S4W61WXQhL6", value: dataItem.PATIENTTYPE });
            attributes.push({ attribute: "SW89b7ha9pI", value: dataItem.SPECIMEN });
            attributes.push({ attribute: "ucGi29EqjWi", value: sampleDate });
            attributes.push({ attribute: "KsSmt7yvreD", value: admissionDate });
            attributes.push({ attribute: "uc7XhXQtAfb", value: dataItem.HCF_TYPE });

            //TO DO : Fetch from DHIS
            const stage1DataElements: { dataElement: string; value: string | number }[] = [];
            stage1DataElements.push({ dataElement: "yY415R8tCzD", value: dataItem.REFERENCEGUIDELINESSIR });
            stage1DataElements.push({ dataElement: "uSsRzrC6In5", value: dataItem.RESULTZONEVALUE });
            stage1DataElements.push({ dataElement: "SouSTl5Of26", value: dataItem.RESULTMICSIR });
            stage1DataElements.push({ dataElement: "yamYqFBDMuI", value: dataItem.SIR });
            stage1DataElements.push({ dataElement: "Zvpep2vznB7", value: dataItem.ISOLATE_ID });
            stage1DataElements.push({ dataElement: "aCaQd9wFURO", value: dataItem.RESULTMICVALUE });
            stage1DataElements.push({ dataElement: "sLfp9RC0CMj", value: dataItem.PATHOGEN });
            stage1DataElements.push({ dataElement: "aAwLdFpNIAg", value: dataItem.ANTIBIOTIC });
            stage1DataElements.push({ dataElement: "CKoG9Gh1s8j", value: dataItem.DISKLOAD });

            const stage2DataElements: { dataElement: string; value: string | number }[] = [];
            stage2DataElements.push({ dataElement: "yY415R8tCzD", value: dataItem.REFERENCEGUIDELINESSIR });
            stage2DataElements.push({ dataElement: "uSsRzrC6In5", value: dataItem.RESULTZONEVALUE });
            stage2DataElements.push({ dataElement: "SouSTl5Of26", value: dataItem.RESULTMICSIR });
            stage2DataElements.push({ dataElement: "yamYqFBDMuI", value: dataItem.SIR });
            stage2DataElements.push({ dataElement: "Zvpep2vznB7", value: dataItem.ISOLATE_ID });
            stage2DataElements.push({ dataElement: "aCaQd9wFURO", value: dataItem.RESULTMICVALUE });
            stage2DataElements.push({ dataElement: "sLfp9RC0CMj", value: dataItem.PATHOGEN });
            stage2DataElements.push({ dataElement: "aAwLdFpNIAg", value: dataItem.ANTIBIOTIC });
            stage2DataElements.push({ dataElement: "CKoG9Gh1s8j", value: dataItem.DISKLOAD });

            events.push({
                program: AMRIProgramID,
                event: "",
                programStage: "ysGSonDq9Bc",
                orgUnit,
                dataValues: stage1DataElements,
                occurredAt: new Date().getTime().toString(),
            });

            events.push({
                program: AMRIProgramID,
                event: "",
                programStage: "KCmWZD8qoAk",
                orgUnit,
                dataValues: stage2DataElements,
                occurredAt: new Date().getTime().toString(),
            });

            enrollments.push({
                orgUnit,
                program: AMRIProgramID,
                enrollment: "",
                trackedEntityType: AMR_GLASS_AMR_TET_PATIENT,
                enrolledAt: "2019-08-19T00:00:00.000",
                deleted: false,
                occurredAt: "2019-08-19T00:00:00.000",
                status: "ACTIVE",
                notes: [],
                relationships: [],
                attributes: attributes,
                events: events,
            });

            const entity: TrackedEntity = {
                orgUnit,
                trackedEntity: "",
                trackedEntityType: AMR_GLASS_AMR_TET_PATIENT,
                enrollments: enrollments,
            };
            return entity;
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
