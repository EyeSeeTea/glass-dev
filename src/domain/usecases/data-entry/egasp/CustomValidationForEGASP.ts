import i18n from "@eyeseetea/d2-ui-components/locales";
import { Dhis2EventsDefaultRepository, Event } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";
import { EventResult } from "../../../entities/program-rules/EventEffectTypes";
import { firstDayOfQuarter, lastDayOfQuarter } from "../../../utils/quarterlyPeriodHelper";

const EGASP_DATAELEMENT_ID = "KaS2YBRN8eH";
export class CustomValidationForEGASP {
    constructor(private dhis2EventsDefaultRepository: Dhis2EventsDefaultRepository) {}
    public getValidatedEvents(events: Event[], orgUnit: string, period: string): FutureData<EventResult> {
        //1. Org unit validation
        const orgUnitErrors = this.checkCountry(events, orgUnit);
        //2. Quarterly period validation
        const periodErrors = this.checkPeriod(events, period);
        //3. Duplicate EGASP ID validation
        return this.checkUniqueEgaspId(events, orgUnit).flatMap(duplicateEGASPIdErrors => {
            const results: EventResult = {
                events: events,
                blockingErrors: [...orgUnitErrors, ...periodErrors, ...duplicateEGASPIdErrors],
                nonBlockingErrors: [],
            };
            return Future.success(results);
        });
    }

    private checkCountry(events: Event[], country: string): ConsistencyError[] {
        const errors = _(
            events.map(event => {
                if (event.orgUnit !== country) {
                    return {
                        error: i18n.t(
                            `Country is different: Selected Data Submission Country : ${country}, Country in file: ${event.orgUnit}`
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

    private checkPeriod(events: Event[], period: string): ConsistencyError[] {
        const errors = _(
            events.map(event => {
                const eventDate = new Date(event.eventDate);
                if (eventDate < firstDayOfQuarter(period) || eventDate > lastDayOfQuarter(period)) {
                    return {
                        error: i18n.t(
                            `Event date is incorrect: Selected Quarterly period : ${period}, date in file: ${event.eventDate}`
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

    private checkUniqueEgaspId(events: Event[], orgUnit: string): FutureData<ConsistencyError[]> {
        //Fetch all existing events for the given org unit with non null egasp ids
        return this.dhis2EventsDefaultRepository.getEGASPEventsByOrgUnit(orgUnit).flatMap(existingEvents => {
            //1. Egasp ids of events in file.
            const fileEgaspIDs = events.map(event => {
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
                    if (duplicateEgaspIdGroup.length > 1) {
                        return {
                            error: i18n.t(
                                `EGASP id is not unique, Duplicate EGASP id : ${duplicateEgaspIdGroup[0]?.egaspId}`
                            ),
                            lines: _(duplicateEgaspIdGroup.map(event => parseInt(event.eventId)))
                                .compact()
                                .value(),
                            count: duplicateEgaspIdGroup.length,
                        };
                    }
                })
                .compact()
                .value();

            return Future.success(errors);
        });
    }
}
