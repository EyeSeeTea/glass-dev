import i18n from "@eyeseetea/d2-ui-components/locales";
import { Future, FutureData } from "../../../entities/Future";
import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { RISIndividualFunghiDataRepository } from "../../../repositories/data-entry/RISIndividualFunghiDataRepository";
import { D2TrackerTrackedEntity as TrackedEntity } from "@eyeseetea/d2-api/api/trackerTrackedEntities";
import { D2TrackerEnrollment, D2TrackerEnrollmentAttribute } from "@eyeseetea/d2-api/api/trackerEnrollments";
import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import { mapToImportSummary, uploadIdListFileAndSave } from "../ImportBLTemplateEventProgram";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { downloadIdsAndDeleteTrackedEntities } from "../amc/ImportAMCProductLevelData";
import { CustomDataColumns } from "../../../entities/data-entry/amr-individual-funghi-external/RISIndividualFunghiData";

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
        private glassUploadsRepository: GlassUploadsRepository,
        private metadataRepository: MetadataRepository
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
        moduleName: string,
        dataColumns: CustomDataColumns
    ): FutureData<ImportSummary> {
        if (action === "CREATE_AND_UPDATE") {
            return this.risIndividualFunghiRepository
                .get(dataColumns, inputFile)
                .flatMap(risIndividualFunghiDataItems => {
                    return this.validateDataItems(risIndividualFunghiDataItems, countryCode, period).flatMap(
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
        risIndividualFunghiDataItems: CustomDataColumns[],
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

    private checkCountry(risIndividualFunghiDataItems: CustomDataColumns[], orgUnit: string): ConsistencyError[] {
        const errors = _(
            risIndividualFunghiDataItems.map((dataItem, index) => {
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
    private checkPeriod(risIndividualFunghiDataItems: CustomDataColumns[], period: string): ConsistencyError[] {
        const errors = _(
            risIndividualFunghiDataItems.map((dataItem, index) => {
                if (dataItem.find(item => item.key === "YEAR")?.value !== parseInt(period)) {
                    return {
                        error: i18n.t(
                            `Year is different: Selected Data Submission Country : ${period}, Country in file: ${
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

    private mapIndividualFunghiDataItemsToEntities(
        individualFunghiDataItems: CustomDataColumns[],
        orgUnit: string,
        AMRIProgramIDl: string,
        AMRDataProgramStageIdl: string,
        countryCode: string
    ): FutureData<TrackedEntity[]> {
        return this.trackerRepository.getProgramMetadata(AMRIProgramIDl, AMRDataProgramStageIdl).flatMap(metadata => {
            const trackedEntities = individualFunghiDataItems.map(dataItem => {
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
