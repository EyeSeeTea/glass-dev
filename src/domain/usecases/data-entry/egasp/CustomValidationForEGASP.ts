import i18n from "@eyeseetea/d2-ui-components/locales";
import { Dhis2EventsDefaultRepository, Event } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";
import { EventResult } from "../../../entities/program-rules/EventEffectTypes";
import { MetadataRepository } from "../../../repositories/MetadataRepository";

const EGASP_DATAELEMENT_ID = "KaS2YBRN8eH";
const PATIENT_DATAELEMENT_ID = "aocFHBxcQa0";
export class CustomValidationForEGASP {
    constructor(
        private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository,
        private metadataRepository: MetadataRepository
    ) {}
    public getValidatedEvents(events: Event[], orgUnit: string, period: string): FutureData<any> {
        //1. Org unit validation
        return this.checkCountry(events, orgUnit).flatMap(orgUnitErrors => {
            //2. Period validation
            const periodErrors = this.checkPeriod(events, period);

            //Fetch all existing EGASP events for the given org unit
            return this.dhis2EventsDefaultRepository.getEGASPEventsByOrgUnit(orgUnit).flatMap(existingEvents => {
                //3. Duplicate EGASP ID within org unit validation
                const duplicateEGASPIdErrors = this.checkUniqueEgaspId(events, existingEvents);

                //4. Duplicate Patient ID and Event date combo within org unit validation
                const duplicatePatientIdErrors = this.checkUniquePatientIdAndDate(events, existingEvents);

                const results: EventResult = {
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
        });
    }

    private checkCountry(events: Event[], country: string): FutureData<ConsistencyError[]> {
        return this.metadataRepository.getClinicsInOrgUnitId(country).map(clinicsInCountry => {
            const errors = _(
                events.map(event => {
                    if (!clinicsInCountry?.includes(event.orgUnit)) {
                        return {
                            error: i18n.t(
                                `Clinic is not part of selected country: Selected Data Submission Country : ${country}, Clinic in file: ${event.orgUnit}`
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
        });
    }

    private checkPeriod(events: Event[], period: string): ConsistencyError[] {
        const errors = _(
            events.map(event => {
                const eventDate = new Date(event.eventDate);
                if (eventDate.getFullYear().toString() !== period) {
                    return {
                        error: i18n.t(
                            `Event date is incorrect: Selected period : ${period}, date in file: ${event.eventDate}`
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
            const egaspDataElement = event.dataValues.find(dv => dv.dataElement === EGASP_DATAELEMENT_ID);
            if (egaspDataElement) return { eventId: event.event, egaspId: egaspDataElement.value };
            else return null;
        });

        //2. Egasp ids of existing events.
        const existingEgaspIDs = existingEvents.map(event => {
            const egaspDataElement = event.dataValues.find(dv => dv.dataElement === EGASP_DATAELEMENT_ID);
            if (egaspDataElement) return { eventId: event.event, egaspId: egaspDataElement.value };
            else return null;
        });

        const egaspIDs = _([...fileEgaspIDs, ...existingEgaspIDs])
            .compact()
            .value();

        const errors = _(egaspIDs)
            .groupBy("egaspId")
            .map(duplicateEgaspIdGroup => {
                if (
                    duplicateEgaspIdGroup.length > 1 &&
                    duplicateEgaspIdGroup.some(pg => fileEgaspIDs.some(fe => pg?.eventId === fe?.eventId))
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

        return errors;
    }

    private checkUniquePatientIdAndDate(fileEvents: Event[], existingEvents: Event[]): ConsistencyError[] {
        //1. Patient ids of events in file.
        const filePatientIDs = fileEvents.map(event => {
            const patientDataElement = event.dataValues.find(dv => dv.dataElement === PATIENT_DATAELEMENT_ID);
            const eventDate = new Date(event.eventDate);

            if (patientDataElement && eventDate instanceof Date && !isNaN(eventDate.getTime()))
                return {
                    eventId: event.event,
                    patientIdAndDate: `${patientDataElement.value},${eventDate.toISOString()}`,
                };
            else return null;
        });

        //2. Egasp ids of existing events.
        const existingPatientsIDs = existingEvents.map(event => {
            const patientDataElement = event.dataValues.find(dv => dv.dataElement === PATIENT_DATAELEMENT_ID);
            const eventDate = new Date(event.eventDate);
            if (patientDataElement && eventDate instanceof Date && !isNaN(eventDate.getTime()))
                return {
                    eventId: event.event,
                    patientIdAndDate: `${patientDataElement.value},${eventDate.toISOString()}`,
                };
            else return null;
        });

        const patientIDs = _([...filePatientIDs, ...existingPatientsIDs])
            .compact()
            .value();

        const errors = _(patientIDs)
            .groupBy("patientIdAndDate")
            .map(duplicatePatientIdGroup => {
                if (
                    duplicatePatientIdGroup.length > 1 &&
                    duplicatePatientIdGroup.some(pg => filePatientIDs.some(fp => pg?.eventId === fp?.eventId))
                ) {
                    if (duplicatePatientIdGroup[0]) {
                        const [patientId, eventDate] = duplicatePatientIdGroup[0]?.patientIdAndDate.split(",");
                        return {
                            error: i18n.t(
                                `This date is already associated to the same Patient-ID. Please check if the current information has already been entered. If not, please check whether the Patient-ID or this date are correct.
                            Patient Id: ${patientId}, Event Date: ${eventDate}`
                            ),
                            lines: _(duplicatePatientIdGroup.map(event => parseInt(event.eventId)))
                                .compact()
                                .value(),
                            count: duplicatePatientIdGroup.length,
                        };
                    }
                }
            })
            .compact()
            .value();

        return errors;
    }
}
