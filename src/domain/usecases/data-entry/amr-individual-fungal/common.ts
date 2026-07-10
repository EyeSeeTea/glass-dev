import _ from "lodash";
import { Country } from "../../../entities/Country";
import { CustomDataColumns } from "../../../entities/data-entry/amr-individual-fungal-external/RISIndividualFungalData";
import { Future, FutureData } from "../../../entities/Future";
import { getTEAValueFromOrganisationUnitCountryEntry } from "../utils/getTEAValueFromOrganisationUnitCountryEntry";
import { BulkLoadMetadata, ValidationResult } from "../../../entities/program-rules/EventEffectTypes";
import { ProgramRuleValidationForBLEventProgram } from "../../program-rules-processing/ProgramRuleValidationForBLEventProgram";
import { ProgramRulesMetadataRepository } from "../../../repositories/program-rules/ProgramRulesMetadataRepository";
import { ConsistencyError, ImportSummary } from "../../../entities/data-entry/ImportSummary";
import {
    TrackerEnrollment,
    TrackerEvent,
    TrackerTrackedEntity,
    TrackerTrackedEntityAttribute,
} from "../../../entities/TrackedEntityInstance";
import {
    AMR_INDIVIDUAL_FUNGAL_DATE_COLUMNS,
    checkAdmissionDate,
    checkCountry,
    checkPeriod,
    checkSpecimenDate,
} from "./RISIndividualFungalFileValidations";
import { parseDateStrict, validateAllDateFieldsInRow } from "../utils/dateValidation";

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
    metadata: Record<"programAttributes" | "programStageDataElements", any> // TODO: type this properly and fix clean architecture violation
): FutureData<TrackerTrackedEntity[]> {
    const trackedEntities = individualFungalDataItems.map(dataItem => {
        const valueByKey = new Map<string, string | number | undefined>();
        for (const item of dataItem) {
            valueByKey.set(item.key, item.value);
        }

        const attributes: TrackerTrackedEntityAttribute[] = metadata.programAttributes.map(
            (attr: { id: string; name: string; code: string; valueType: string }) => {
                const currentValue = valueByKey.get(attr.code);

                if (attr.valueType === "ORGANISATION_UNIT" && typeof currentValue === "string") {
                    return {
                        attribute: attr.id,
                        value: getTEAValueFromOrganisationUnitCountryEntry(allCountries, currentValue, true),
                    };
                }

                return {
                    attribute: attr.id,
                    value: currentValue ?? "",
                };
            }
        );
        const AMRDataStage: { dataElement: string; value: string }[] = metadata.programStageDataElements.map(
            (de: { id: string; name: string; code: string }) => {
                return {
                    dataElement: de.id,
                    value: valueByKey.get(de.code) ?? "",
                };
            }
        );

        const sampleDateStr =
            AMRDataStage.find(de => de.dataElement === AMR_GLASS_AMR_DET_SAMPLE_DATE)?.value ?? `${period}-01-01`;
        const sampleDate = parseDateStrict(sampleDateStr) ?? period;

        const createdAt = new Date().toISOString().split("T")[0] ?? period;

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
}

function addPositionalIdsToTeis(teis: TrackerTrackedEntity[]): TrackerTrackedEntity[] {
    return teis.map((tei, teiIndex) => {
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
}

function removePositionalIdsFromTeis(
    teis: ReadonlyArray<TrackerTrackedEntity> | undefined
): TrackerTrackedEntity[] | undefined {
    return teis?.map(tei => {
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
}

export function runProgramRuleValidations(
    programId: string,
    teis: TrackerTrackedEntity[],
    AMRDataProgramStageIdl: string,
    programRulesMetadataRepository: ProgramRulesMetadataRepository,
    programRulesMetadata?: BulkLoadMetadata
): FutureData<ValidationResult> {
    //1. Before running validations, add ids to tei, enrollement and event so thier relationships can be processed.
    const teisWithId = addPositionalIdsToTeis(teis);

    //2. Run Program Rule Validations
    const programRuleValidations = new ProgramRuleValidationForBLEventProgram(programRulesMetadataRepository);

    const $validation = programRulesMetadata
        ? programRuleValidations.getValidatedTeisAndEventsFromMetadata(
              programRulesMetadata,
              [],
              teisWithId,
              AMRDataProgramStageIdl
          )
        : programRuleValidations.getValidatedTeisAndEvents(programId, [], teisWithId, AMRDataProgramStageIdl);

    return $validation.flatMap(programRuleValidationResults => {
        //3. After processing, remove ids to tei, enrollement and events so that they can be imported
        return Future.success({
            blockingErrors: programRuleValidationResults.blockingErrors,
            nonBlockingErrors: programRuleValidationResults.nonBlockingErrors,
            teis: removePositionalIdsFromTeis(programRuleValidationResults.teis),
        });
    });
}

/**
 * Async-upload-only variant of runProgramRuleValidations: same validation outcome, but the
 * metadata-derived rule structures are built once per chunk instead of once per event,
 * which makes validating large CSV chunks an order of magnitude faster.
 */
export function runProgramRuleValidationsForAsyncUpload(
    programId: string,
    teis: TrackerTrackedEntity[],
    AMRDataProgramStageIdl: string,
    programRulesMetadataRepository: ProgramRulesMetadataRepository,
    programRulesMetadata?: BulkLoadMetadata
): FutureData<ValidationResult> {
    //1. Before running validations, add ids to tei, enrollement and event so thier relationships can be processed.
    const teisWithId = addPositionalIdsToTeis(teis);

    //2. Run Program Rule Validations building the static rule context once per chunk
    const programRuleValidations = new ProgramRuleValidationForBLEventProgram(programRulesMetadataRepository);

    const $metadata: FutureData<BulkLoadMetadata> = programRulesMetadata
        ? Future.success(programRulesMetadata)
        : programRulesMetadataRepository.getMetadata(programId);

    return $metadata
        .flatMap(metadata =>
            programRuleValidations.getValidatedTeisAndEventsFromMetadataForAsyncUpload(
                metadata,
                [],
                teisWithId,
                AMRDataProgramStageIdl
            )
        )
        .flatMap(programRuleValidationResults => {
            //3. After processing, remove ids to tei, enrollement and events so that they can be imported
            return Future.success({
                blockingErrors: programRuleValidationResults.blockingErrors,
                nonBlockingErrors: programRuleValidationResults.nonBlockingErrors,
                teis: removePositionalIdsFromTeis(programRuleValidationResults.teis),
            });
        });
}

type CustomValidationFunction = (dataItem: CustomDataColumns) => string | null;

export function runCustomValidations(
    risIndividualFungalDataItems: CustomDataColumns[],
    orgUnit: string,
    period: string,
    fileLineStart = 2
): FutureData<ImportSummary> {
    // Step 1: date format validation across all rows — collect every bad cell before blocking
    const dateFormatErrors = risIndividualFungalDataItems.flatMap((dataItem, index) => {
        const row: Record<string, string> = Object.fromEntries(
            dataItem
                .filter(item => item.value !== undefined && item.value !== null)
                .map(item => [item.key, item.value?.toString() ?? ""])
        );
        return validateAllDateFieldsInRow(row, AMR_INDIVIDUAL_FUNGAL_DATE_COLUMNS, index + 1).map(err => ({
            error: err.message,
            line: index,
        }));
    });

    // Step 2: if any date format errors exist, return them immediately — business logic
    // relies on parseDateStrict which only works on valid ISO dates, so we must not
    // proceed until every date field is in the correct format.
    if (dateFormatErrors.length > 0) {
        const groupedFormatErrors = _(dateFormatErrors)
            .groupBy(e => e.error)
            .mapValues(v => v.map(e => e.line))
            .value();
        const blockingErrors: ConsistencyError[] = Object.keys(groupedFormatErrors).map(error => ({
            error,
            count: groupedFormatErrors[error]?.length ?? 0,
            lines: groupedFormatErrors[error] ?? [],
        }));
        return Future.success({
            status: "ERROR",
            importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0, total: 0 },
            nonBlockingErrors: [],
            blockingErrors,
        });
    }

    // Step 3: all dates are valid ISO — run business logic checks
    const validations: CustomValidationFunction[] = [
        (dataItem: CustomDataColumns) => checkCountry(dataItem, orgUnit),
        (dataItem: CustomDataColumns) => checkPeriod(dataItem, period),
        (dataItem: CustomDataColumns) => checkSpecimenDate(dataItem, period),
        (dataItem: CustomDataColumns) => checkAdmissionDate(dataItem),
    ];
    const businessErrors = risIndividualFungalDataItems.flatMap((dataItem, index) => {
        const line = fileLineStart + index;
        return validations.map(validation => {
            const error = validation(dataItem);
            if (error) {
                return {
                    error: error,
                    line: line,
                };
            }
            return null;
        });
    });

    const groupedErrors = _(businessErrors)
        .omitBy(_.isNil)
        .groupBy(error => error?.error)
        .mapValues(value => value.map(el => el?.line || 0))
        .value();
    const blockingErrors: ConsistencyError[] = Object.keys(groupedErrors).map(error => ({
        error: error,
        count: groupedErrors[error]?.length || 0,
        lines: groupedErrors[error] || [],
    }));
    const summary: ImportSummary = {
        status: "ERROR",
        importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0, total: 0 },
        nonBlockingErrors: [],
        blockingErrors: blockingErrors,
    };
    return Future.success(summary);
}
