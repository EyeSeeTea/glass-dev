import {
    Enrollment,
    EnrollmentAttribute,
    EnrollmentEvent,
    TrackedEntity,
} from "../../../../data/repositories/TrackerDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { RISIndividualData } from "../../../entities/data-entry/amr-i-external/RISIndividualData";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { RISIndividualDataRepository } from "../../../repositories/data-entry/RISIndividualDataRepository";

const AMRIProgramID = "mMAj6Gofe49";
const AMR_GLASS_AMR_TET_PATIENT = "CcgnfemKr5U";
export class ImportRISIndividualFile {
    constructor(
        private risIndividualRepository: RISIndividualDataRepository,
        private trackerRepository: TrackerRepository
    ) {}

    public importRISIndividualFile(
        inputFile: File,
        action: ImportStrategy,
        orgUnit: string,
        period: string
    ): FutureData<ImportSummary> {
        return this.risIndividualRepository.get(inputFile).flatMap(risIndividualDataItems => {
            console.debug(risIndividualDataItems, action, orgUnit, period);
            //TO DO : Add Validation

            //Import RIS data
            const entities = this.mapIndividualDataItemsToEntities(risIndividualDataItems, orgUnit);
            return this.trackerRepository.import(entities).flatMap(summary => {
                console.debug(summary);
                const successSummary: ImportSummary = {
                    status: "SUCCESS",
                    importCount: {
                        ignored: 0,
                        imported: 0,
                        deleted: 0,
                        updated: 0,
                    },
                    nonBlockingErrors: [],
                    blockingErrors: [],
                };
                return Future.success(successSummary);
            });
        });
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
}
