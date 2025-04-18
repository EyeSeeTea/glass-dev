import _ from "lodash";
import { Country } from "../../../entities/Country";
import { CustomDataColumns } from "../../../entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { Future, FutureData } from "../../../entities/Future";
import moment from "moment";
import { getTEAValueFromOrganisationUnitCountryEntry } from "../utils/getTEAValueFromOrganisationUnitCountryEntry";
import { TrackerRepository } from "../../../repositories/TrackerRepository";
import { ValidationResult } from "../../../entities/program-rules/EventEffectTypes";
import { ProgramRuleValidationForBLEventProgram } from "../../program-rules-processing/ProgramRuleValidationForBLEventProgram";
import { ProgramRulesMetadataRepository } from "../../../repositories/program-rules/ProgramRulesMetadataRepository";
import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";
import {
    TrackerEnrollment,
    TrackerEvent,
    TrackerTrackedEntity,
    TrackerTrackedEntityAttribute,
} from "../../../entities/TrackedEntityInstance";

const AMR_GLASS_AMR_TET_PATIENT = "CcgnfemKr5U";

const PATIENT_COUNTER_ID = "uSGcLbT5gJJ";
const PATIENT_ID = "qKWPfeSgTnc";
const AMR_GLASS_AMR_DET_SAMPLE_DATE = "Xtn5zEL9mGx";

export function mapIndividualFungalDataItemsToEntities(
    individualFungalDataItems: CustomDataColumns[],
    orgUnit: string,
    AMRIProgramIDl: string,
    AMRDataProgramStageIdl: string,
    countryCode: string,
    period: string,
    allCountries: Country[],
    trackerRepository: TrackerRepository
): FutureData<TrackerTrackedEntity[]> {
    return trackerRepository.getProgramMetadata(AMRIProgramIDl, AMRDataProgramStageIdl).flatMap(metadata => {
        const trackedEntities = individualFungalDataItems.map(dataItem => {
            const attributes: TrackerTrackedEntityAttribute[] = metadata.programAttributes.map(
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
                AMRDataStage.find(de => de.dataElement === AMR_GLASS_AMR_DET_SAMPLE_DATE)?.value ?? `01-01-${period}`;
            const sampleDate = moment(new Date(sampleDateStr)).toISOString()?.split("T").at(0) ?? period;

            const createdAt = moment(new Date()).toISOString()?.split("T").at(0) ?? period;

            const events: TrackerEvent[] = [
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
            const enrollments: TrackerEnrollment[] = [
                {
                    orgUnit,
                    program: AMRIProgramIDl,
                    trackedEntity: "",
                    enrollment: "",
                    trackedEntityType: AMR_GLASS_AMR_TET_PATIENT,
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

            const entity: TrackerTrackedEntity = {
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

export function runProgramRuleValidations(
    programId: string,
    teis: TrackerTrackedEntity[],
    AMRDataProgramStageIdl: string,
    programRulesMetadataRepository: ProgramRulesMetadataRepository
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
    const programRuleValidations = new ProgramRuleValidationForBLEventProgram(programRulesMetadataRepository);

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

function checkCountry(risIndividualFungalDataItems: CustomDataColumns[], orgUnit: string): ConsistencyError[] {
    const errors = _(
        risIndividualFungalDataItems.map((dataItem, index) => {
            if (dataItem.find(item => item.key === "COUNTRY")?.value !== orgUnit) {
                return {
                    error: `Country is different: Selected Data Submission Country : ${orgUnit}, Country in file: ${
                        dataItem.find(item => item.key === "COUNTRY")?.value
                    }`,
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

function checkPeriod(risIndividualFungalDataItems: CustomDataColumns[], period: string): ConsistencyError[] {
    const errors = _(
        risIndividualFungalDataItems.map((dataItem, index) => {
            if (dataItem.find(item => item.key === "YEAR")?.value !== parseInt(period)) {
                return {
                    error: `Year is different: Selected Data Submission Year : ${period}, Year in file: ${
                        dataItem.find(item => item.key === "YEAR")?.value
                    }`,
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

export function runCustomValidations(
    risIndividualFungalDataItems: CustomDataColumns[],
    orgUnit: string,
    period: string
): FutureData<ImportSummary> {
    const orgUnitErrors = checkCountry(risIndividualFungalDataItems, orgUnit);
    const periodErrors = checkPeriod(risIndividualFungalDataItems, period);
    const summary: ImportSummary = {
        status: "ERROR",
        importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0, total: 0 },
        nonBlockingErrors: [],
        blockingErrors: [...orgUnitErrors, ...periodErrors],
    };
    return Future.success(summary);
}
