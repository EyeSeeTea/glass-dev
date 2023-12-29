import i18n from "@eyeseetea/d2-ui-components/locales";
import { Dhis2EventsDefaultRepository } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";
import { ValidationResult } from "../../../entities/program-rules/EventEffectTypes";
import { D2TrackerEvent as Event } from "@eyeseetea/d2-api/api/trackerEvents";
import { MetadataRepository } from "../../../repositories/MetadataRepository";
import { AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID } from "../amc/ImportAMCSubstanceLevelData";
import { EGASP_PROGRAM_ID } from "../../../../data/repositories/program-rule/ProgramRulesMetadataDefaultRepository";

const EGASP_DATAELEMENT_ID = "KaS2YBRN8eH";
const PATIENT_DATAELEMENT_ID = "aocFHBxcQa0";
export class CustomValidationForEventProgram {
    constructor(
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private metadataRepository: MetadataRepository
    ) {}
    public getValidatedEvents(
        events: Event[],
        orgUnitId: string,
        orgUnitName: string,
        period: string,
        programId: string
    ): FutureData<any> {
        const checkClinics = programId === EGASP_PROGRAM_ID ? true : false;
        //1. Org unit validation
        return this.checkCountry(events, orgUnitId, orgUnitName, checkClinics).flatMap(orgUnitErrors => {
            //2. Period validation
            const periodErrors = this.checkPeriod(events, period);

            if (programId === AMC_RAW_SUBSTANCE_CONSUMPTION_PROGRAM_ID) {
                const results: ValidationResult = {
                    events: events,
                    blockingErrors: [...orgUnitErrors, ...periodErrors],
                    nonBlockingErrors: [],
                };

                return Future.success(results);
            } else if (programId === EGASP_PROGRAM_ID) {
                //Fetch all existing EGASP events for the given org unit
                return this.dhis2EventsDefaultRepository.getEGASPEventsByOrgUnit(orgUnitId).flatMap(existingEvents => {
                    //3. Duplicate EGASP ID within org unit validation
                    const duplicateEGASPIdErrors = this.checkUniqueEgaspId(events, existingEvents);

                    //4. Duplicate Patient ID and Event date combo within org unit validation
                    const duplicatePatientIdErrors = this.checkUniquePatientIdAndDate(events, existingEvents);

                    const results: ValidationResult = {
                        events: events,
                        blockingErrors: [
                            ...orgUnitErrors,
                            ...periodErrors,
                            ...duplicateEGASPIdErrors,
                            ...duplicatePatientIdErrors,
                        ],
                        nonBlockingErrors: [],
                    };

                    return Future.success(results);
                });
            } //unkown program id, return success
            else {
                const results: ValidationResult = {
                    events: events,
                    blockingErrors: [],
                    nonBlockingErrors: [],
                };
                return Future.success(results);
            }
        });
    }

    private checkCountry(
        events: Event[],
        countryId: string,
        countryName: string,
        checkClinics: boolean
    ): FutureData<ConsistencyError[]> {
        const clinicsInEvents = events.map(e => e.orgUnit);
        return Future.joinObj({
            clinicsInCountry: checkClinics
                ? this.metadataRepository.getClinicsAndLabsInOrgUnitId(countryId)
                : Future.success(undefined),
            clinicNamesInEvents: checkClinics
                ? this.metadataRepository.getClinicOrLabNames(clinicsInEvents)
                : Future.success(undefined),
        }).map(({ clinicsInCountry, clinicNamesInEvents }) => {
            const errors = _(
                events.map(event => {
                    if (checkClinics) {
                        if (!clinicsInCountry?.includes(event.orgUnit)) {
                            const clinicName =
                                clinicNamesInEvents?.find(c => c.id === event.orgUnit)?.name ?? event.orgUnit;
                            return {
                                error: i18n.t(
                                    `Clinics in file, are not part of the selected country: Selected Country : ${countryName}, Clinic in file: ${clinicName}`
                                ),
                                line: parseInt(event.event),
                            };
                        }
                    } else {
                        if (event.orgUnit !== countryId) {
                            return {
                                error: i18n.t(
                                    `Selected Country is incorrect: Selected country : ${countryName}, country in file: ${event.orgUnit}`
                                ),
                                line: parseInt(event.event),
                            };
                        }
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
        });
    }

    private checkPeriod(events: Event[], period: string): ConsistencyError[] {
        const errors = _(
            events.map(event => {
                const eventDate = new Date(event.occurredAt);
                if (eventDate.getFullYear().toString() !== period) {
                    return {
                        error: i18n.t(
                            `Event date is incorrect: Selected period : ${period}, date in file: ${event.occurredAt}`
                        ),
                        line: parseInt(event.event),
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

    private checkUniqueEgaspId(fileEvents: Event[], existingEvents: Event[]): ConsistencyError[] {
        //1. Egasp ids of events in file.
        const fileEgaspIDs = fileEvents.map(event => {
            const egaspDataElement = event?.dataValues?.find(dv => dv.dataElement === EGASP_DATAELEMENT_ID);
            if (egaspDataElement)
                return { eventId: event.event, orgUnit: event.orgUnit, egaspId: egaspDataElement.value };
            else return null;
        });

        //2. Egasp ids of existing events.
        const existingEgaspIDs = existingEvents.map(event => {
            const egaspDataElement = event?.dataValues?.find(dv => dv.dataElement === EGASP_DATAELEMENT_ID);
            if (egaspDataElement)
                return { eventId: event.event, orgUnit: event.orgUnit, egaspId: egaspDataElement.value };
            else return null;
        });

        const egaspIDs = _([...fileEgaspIDs, ...existingEgaspIDs])
            .compact()
            .value();

        const errors = _(egaspIDs)
            .groupBy("egaspId")
            .map(duplicateEgaspIdGroup => {
                return _(duplicateEgaspIdGroup)
                    .groupBy("orgUnit")
                    .map(duplicatesByOU => {
                        if (
                            duplicatesByOU.length > 1 &&
                            duplicatesByOU.some(pg => fileEgaspIDs.some(fe => pg?.eventId === fe?.eventId))
                        ) {
                            return {
                                error: i18n.t(`This EGASP ID already exists : ${duplicateEgaspIdGroup[0]?.egaspId}`),
                                lines: _(duplicateEgaspIdGroup.map(event => parseInt(event.eventId)))
                                    .compact()
                                    .value(),
                                count: duplicateEgaspIdGroup.length,
                            };
                        }
                    })
                    .compact()
                    .value();
            })
            .flatMap()
            .compact()
            .value();

        return errors;
    }

    private checkUniquePatientIdAndDate(fileEvents: Event[], existingEvents: Event[]): ConsistencyError[] {
        //1. Patient ids of events in file.
        const filePatientIDs = fileEvents.map(event => {
            const patientDataElement = event.dataValues.find(dv => dv.dataElement === PATIENT_DATAELEMENT_ID);
            const eventDate = new Date(event.occurredAt);

            if (patientDataElement && eventDate instanceof Date && !isNaN(eventDate.getTime()))
                return {
                    eventId: event.event,
                    patientIdAndDate: `${patientDataElement.value},${eventDate.toISOString()}`,
                    orgUnit: event.orgUnit,
                };
            else return null;
        });

        //2. Egasp ids of existing events.
        const existingPatientsIDs = existingEvents.map(event => {
            const patientDataElement = event?.dataValues?.find(dv => dv.dataElement === PATIENT_DATAELEMENT_ID);
            const eventDate = new Date(event.occurredAt);
            if (patientDataElement && eventDate instanceof Date && !isNaN(eventDate.getTime()))
                return {
                    eventId: event.event,
                    patientIdAndDate: `${patientDataElement.value},${eventDate.toISOString()}`,
                    orgUnit: event.orgUnit,
                };
            else return null;
        });

        const patientIDs = _([...filePatientIDs, ...existingPatientsIDs])
            .compact()
            .value();

        const errors = _(patientIDs)
            .groupBy("patientIdAndDate")
            .map(duplicatePatientIdGroup => {
                return _(duplicatePatientIdGroup)
                    .groupBy("orgUnit")
                    .map(duplicatesByOU => {
                        if (
                            duplicatesByOU.length > 1 &&
                            duplicatesByOU.some(pg => filePatientIDs.some(fp => pg?.eventId === fp?.eventId))
                        ) {
                            if (duplicatesByOU[0]) {
                                const [patientId, eventDate] = duplicatesByOU[0]?.patientIdAndDate.split(",");
                                return {
                                    error: i18n.t(
                                        `This date is already associated to the same Patient-ID. Please check if the current information has already been entered. If not, please check whether the Patient-ID or this date are correct.
                            Patient Id: ${patientId}, Event Date: ${eventDate}`
                                    ),
                                    lines: _(duplicatesByOU.map(event => parseInt(event.eventId)))
                                        .compact()
                                        .value(),
                                    count: duplicatesByOU.length,
                                };
                            }
                        }
                    })
                    .compact()
                    .value();
            })
            .flatMap()
            .compact()
            .value();

        return errors;
    }
}
