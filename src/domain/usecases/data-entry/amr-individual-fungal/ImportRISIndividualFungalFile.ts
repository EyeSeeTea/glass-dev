import { Future, FutureData } from "../../../entities/Future";
import { ImportStrategy } from "../../../entities/data-entry/DataValuesSaveSummary";
import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";
import { GlassDocumentsRepository } from "../../../repositories/GlassDocumentsRepository";
import { GlassUploadsRepository } from "../../../repositories/GlassUploadsRepository";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { RISIndividualFungalDataRepository } from "../../../repositories/data-entry/RISIndividualFungalDataRepository";
import { D2TrackerTrackedEntity } from "@eyeseetea/d2-api/api/trackerTrackedEntities";
import { D2TrackerEnrollment, D2TrackerEnrollmentAttribute } from "@eyeseetea/d2-api/api/trackerEnrollments";
import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import { mapToImportSummary, uploadIdListFileAndSave } from "../ImportBLTemplateEventProgram";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { CustomDataColumns } from "../../../entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import moment from "moment";
import { ValidationResult } from "../../../entities/program-rules/EventEffectTypes";
import { ProgramRuleValidationForBLEventProgram } from "../../program-rules-processing/ProgramRuleValidationForBLEventProgram";
import { ProgramRulesMetadataRepository } from "../../../repositories/program-rules/ProgramRulesMetadataRepository";
import { downloadIdsAndDeleteTrackedEntities } from "../utils/downloadIdsAndDeleteTrackedEntities";
import { getTEAValueFromOrganisationUnitCountryEntry } from "../utils/getTEAValueFromOrganisationUnitCountryEntry";
import { Country } from "../../../entities/Country";
import i18n from "../../../../locales";

export const AMRIProgramID = "mMAj6Gofe49";
export const AMR_GLASS_AMR_TET_PATIENT = "CcgnfemKr5U";
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
        private metadataRepository: MetadataRepository,
        private programRulesMetadataRepository: ProgramRulesMetadataRepository
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
        dataColumns: CustomDataColumns,
        allCountries: Country[]
    ): FutureData<ImportSummary> {
        if (action === "CREATE_AND_UPDATE") {
            return this.risIndividualFungalRepository
                .get(dataColumns, inputFile)
                .flatMap(risIndividualFungalDataItems => {
                    return this.runCustomValidations(risIndividualFungalDataItems, countryCode, period).flatMap(
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
                                period,
                                allCountries
                            ).flatMap(entities => {
                                return this.runProgramRuleValidations(
                                    AMRIProgramIDl,
                                    entities,
                                    AMRDataProgramStageIdl()
                                ).flatMap(validationResult => {
                                    if (validationResult.blockingErrors.length > 0) {
                                        const errorSummary: ImportSummary = {
                                            status: "ERROR",
                                            importCount: {
                                                ignored: 0,
                                                imported: 0,
                                                deleted: 0,
                                                updated: 0,
                                            },
                                            nonBlockingErrors: validationResult.nonBlockingErrors,
                                            blockingErrors: validationResult.blockingErrors,
                                        };
                                        return Future.success(errorSummary);
                                    }

                                    return this.trackerRepository
                                        .import(
                                            {
                                                trackedEntities:
                                                    validationResult.teis && validationResult.teis.length > 0
                                                        ? validationResult.teis
                                                        : [],
                                            },
                                            action
                                        )
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
                            });
                        }
                    );
                });
        } else {
            // NOTICE: check also DeleteRISIndividualFungalFileUseCase.ts that contains same code adapted for node environment (only DELETE)
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

    private runCustomValidations(
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

    private runProgramRuleValidations(
        programId: string,
        teis: D2TrackerTrackedEntity[],
        AMRDataProgramStageIdl: string
    ): FutureData<ValidationResult> {
        //1. Before running validations, add ids to tei, enrollement and event so thier relationships can be processed.
        const teisWithId = teis?.map((tei, teiIndex) => {
            const enrollmentsWithId = tei.enrollments?.map((enrollment, enrollmentIndex) => {
                const eventsWithIds = enrollment.events.map((ev, eventIndex) => {
                    return {
                        ...ev,
                        event: (eventIndex + 1 + teiIndex).toString(),
                        enrollment: enrollmentIndex.toString(),
                        trackedEntity: teiIndex.toString(),
                    };
                });
                return { ...enrollment, enrollment: enrollmentIndex.toString(), events: eventsWithIds };
            });

            return { ...tei, enrollments: enrollmentsWithId, trackedEntity: teiIndex.toString() };
        });

        //2. Run Program Rule Validations
        const programRuleValidations = new ProgramRuleValidationForBLEventProgram(this.programRulesMetadataRepository);

        return programRuleValidations
            .getValidatedTeisAndEvents(programId, [], teisWithId, AMRDataProgramStageIdl)
            .flatMap(programRuleValidationResults => {
                //3. After processing, remove ids to tei, enrollement and events so that they can be imported
                const teisWithoutId = programRuleValidationResults.teis?.map(tei => {
                    const enrollementsWithoutId = tei.enrollments?.map(enrollment => {
                        const eventsWithoutIds = enrollment.events.map(ev => {
                            return {
                                ...ev,
                                event: "",
                                enrollment: "",
                                trackedEntity: "",
                            };
                        });

                        return { ...enrollment, enrollment: "", events: eventsWithoutIds };
                    });
                    return { ...tei, enrollments: enrollementsWithoutId, trackedEntity: "" };
                });

                return Future.success({
                    blockingErrors: programRuleValidationResults.blockingErrors,
                    nonBlockingErrors: programRuleValidationResults.nonBlockingErrors,
                    teis: teisWithoutId,
                });
            });
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
        period: string,
        allCountries: Country[]
    ): FutureData<D2TrackerTrackedEntity[]> {
        return this.trackerRepository.getProgramMetadata(AMRIProgramIDl, AMRDataProgramStageIdl).flatMap(metadata => {
            const trackedEntities = individualFungalDataItems.map(dataItem => {
                const attributes: D2TrackerEnrollmentAttribute[] = metadata.programAttributes.map(
                    (attr: { id: string; name: string; code: string; valueType: string }) => {
                        const currentAttribute = dataItem.find(item => item.key === attr.code);

                        if (attr.valueType === "ORGANISATION_UNIT" && typeof currentAttribute?.value === "string") {
                            return {
                                attribute: attr.id,
                                value: currentAttribute
                                    ? getTEAValueFromOrganisationUnitCountryEntry(
                                          allCountries,
                                          currentAttribute.value,
                                          true
                                      )
                                    : "",
                            };
                        }

                        return {
                            attribute: attr.id,
                            value: currentAttribute?.value ?? "",
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
                const sampleDate = moment(new Date(sampleDateStr)).toISOString()?.split("T").at(0) ?? period;

                const createdAt = moment(new Date()).toISOString()?.split("T").at(0) ?? period;

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

                const entity: D2TrackerTrackedEntity = {
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
