import i18n from "@eyeseetea/d2-ui-components/locales";
import { Future, FutureData } from "../../../entities/Future";
import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { RISIndividualFungalDataRepository } from "../../../repositories/data-entry/RISIndividualFungalDataRepository";
import { D2TrackerTrackedEntity as TrackedEntity } from "@eyeseetea/d2-api/api/trackerTrackedEntities";
import { D2TrackerEnrollment, D2TrackerEnrollmentAttribute } from "@eyeseetea/d2-api/api/trackerEnrollments";
import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import { mapToImportSummary, uploadIdListFileAndSave } from "../ImportBLTemplateEventProgram";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { downloadIdsAndDeleteTrackedEntities } from "../amc/ImportAMCProductLevelData";
import { CustomDataColumns } from "../../../entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import moment from "moment";

export const AMRIProgramID = "mMAj6Gofe49";
const AMR_GLASS_AMR_TET_PATIENT = "CcgnfemKr5U";
export const AMRDataProgramStageId = "KCmWZD8qoAk";
export const AMRCandidaProgramStageId = "ysGSonDq9Bc";

const PATIENT_COUNTER_ID = "uSGcLbT5gJJ";
const PATIENT_ID = "qKWPfeSgTnc";
const AMR_GLASS_AMR_DET_SAMPLE_DATE = "Xtn5zEL9mGx";

export class ImportRISIndividualFungalFile {
    constructor(
        private risIndividualFungalRepository: RISIndividualFungalDataRepository,
        private trackerRepository: TrackerRepository,
        private glassDocumentsRepository: GlassDocumentsRepository,
        private glassUploadsRepository: GlassUploadsRepository,
        private metadataRepository: MetadataRepository
    ) {}

    public importRISIndividualFungalFile(
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
        moduleName: string,
        dataColumns: CustomDataColumns
    ): FutureData<ImportSummary> {
        if (action === "CREATE_AND_UPDATE") {
            return this.risIndividualFungalRepository
                .get(dataColumns, inputFile)
                .flatMap(risIndividualFungalDataItems => {
                    return this.validateDataItems(risIndividualFungalDataItems, countryCode, period).flatMap(
                        validationSummary => {
                            //If there are blocking errors on custom validation, do not import. Return immediately.
                            if (validationSummary.blockingErrors.length > 0) {
                                return Future.success(validationSummary);
                            }
                            //Import RIS data
                            const AMRIProgramIDl = program ? program.id : AMRIProgramID;

                            const AMRDataProgramStageIdl = () => {
                                if (program) {
                                    return program.programStageId;
                                } else {
                                    return moduleName === "AMR - Individual"
                                        ? AMRDataProgramStageId
                                        : AMRCandidaProgramStageId;
                                }
                            };

                            return this.mapIndividualFungalDataItemsToEntities(
                                risIndividualFungalDataItems,
                                orgUnit,
                                AMRIProgramIDl,
                                AMRDataProgramStageIdl(),
                                countryCode,
                                period
                            ).flatMap(entities => {
                                return this.trackerRepository
                                    .import({ trackedEntities: entities }, action)
                                    .flatMap(response => {
                                        return mapToImportSummary(
                                            response,
                                            "trackedEntity",
                                            this.metadataRepository
                                        ).flatMap(summary => {
                                            return uploadIdListFileAndSave(
                                                "primaryUploadId",
                                                summary,
                                                moduleName,
                                                this.glassDocumentsRepository,
                                                this.glassUploadsRepository
                                            );
                                        });
                                    });
                            });
                        }
                    );
                });
        } else {
            return downloadIdsAndDeleteTrackedEntities(
                eventListId,
                orgUnit,
                action,
                AMR_GLASS_AMR_TET_PATIENT,
                this.glassDocumentsRepository,
                this.trackerRepository,
                this.metadataRepository
            );
        }
    }

    private validateDataItems(
        risIndividualFungalDataItems: CustomDataColumns[],
        orgUnit: string,
        period: string
    ): FutureData<ImportSummary> {
        const orgUnitErrors = this.checkCountry(risIndividualFungalDataItems, orgUnit);
        const periodErrors = this.checkPeriod(risIndividualFungalDataItems, period);
        const summary: ImportSummary = {
            status: "ERROR",
            importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
            nonBlockingErrors: [],
            blockingErrors: [...orgUnitErrors, ...periodErrors],
        };
        return Future.success(summary);
    }

    private checkCountry(risIndividualFungalDataItems: CustomDataColumns[], orgUnit: string): ConsistencyError[] {
        const errors = _(
            risIndividualFungalDataItems.map((dataItem, index) => {
                if (dataItem.find(item => item.key === "COUNTRY")?.value !== orgUnit) {
                    return {
                        error: i18n.t(
                            `Country is different: Selected Data Submission Country : ${orgUnit}, Country in file: ${
                                dataItem.find(item => item.key === "COUNTRY")?.value
                            }`
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
    private checkPeriod(risIndividualFungalDataItems: CustomDataColumns[], period: string): ConsistencyError[] {
        const errors = _(
            risIndividualFungalDataItems.map((dataItem, index) => {
                if (dataItem.find(item => item.key === "YEAR")?.value !== parseInt(period)) {
                    return {
                        error: i18n.t(
                            `Year is different: Selected Data Submission Year : ${period}, Year in file: ${
                                dataItem.find(item => item.key === "YEAR")?.value
                            }`
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

    private mapIndividualFungalDataItemsToEntities(
        individualFungalDataItems: CustomDataColumns[],
        orgUnit: string,
        AMRIProgramIDl: string,
        AMRDataProgramStageIdl: string,
        countryCode: string,
        period: string
    ): FutureData<TrackedEntity[]> {
        return this.trackerRepository.getProgramMetadata(AMRIProgramIDl, AMRDataProgramStageIdl).flatMap(metadata => {
            const trackedEntities = individualFungalDataItems.map(dataItem => {
                const attributes: D2TrackerEnrollmentAttribute[] = metadata.programAttributes.map(
                    (attr: { id: string; name: string; code: string }) => {
                        return {
                            attribute: attr.id,
                            value: dataItem.find(item => item.key === attr.code)?.value ?? "",
                        };
                    }
                );
                const AMRDataStage: { dataElement: string; value: string }[] = metadata.programStageDataElements.map(
                    (de: { id: string; name: string; code: string }) => {
                        return {
                            dataElement: de.id,
                            value: dataItem.find(item => item.key === de.code)?.value ?? "",
                        };
                    }
                );

                const sampleDateStr =
                    AMRDataStage.find(de => de.dataElement === AMR_GLASS_AMR_DET_SAMPLE_DATE)?.value ??
                    `01-01-${period}`;
                const sampleDate = moment(new Date(sampleDateStr)).toISOString().split("T").at(0) ?? period;

                const createdAt = moment(new Date()).toISOString().split("T").at(0) ?? period;

                const events: D2TrackerEvent[] = [
                    {
                        program: AMRIProgramIDl,
                        event: "",
                        programStage: AMRDataProgramStageIdl,
                        orgUnit,
                        dataValues: AMRDataStage,
                        occurredAt: sampleDate,
                        status: "COMPLETED",
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
                        enrolledAt: sampleDate,
                        occurredAt: sampleDate,
                        createdAt: createdAt,
                        createdAtClient: createdAt,
                        updatedAt: createdAt,
                        updatedAtClient: createdAt,
                        status: "COMPLETED",
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
                            value: attributes.find(at => at.attribute === PATIENT_COUNTER_ID)?.value.toString() ?? "",
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
}
