import i18n from "@eyeseetea/d2-ui-components/locales";
import { Event } from "../../../../data/repositories/Dhis2EventsDefaultRepository";
import { Future, FutureData } from "../../../entities/Future";
import { ConsistencyError } from "../../../entities/data-entry/ImportSummary";
import { EventResult } from "../../../entities/program-rules/EventEffectTypes";
import { firstDayOfQuarter, lastDayOfQuarter } from "../../../utils/quarterlyPeriodHelper";

export class CustomValidationForEGASP {
    public getValidatedEvents(events: Event[], orgUnit: string, period: string): FutureData<EventResult> {
        const orgUnitError = this.checkCountry(events, orgUnit);
        const periodError = this.checkPeriod(events, period);
        const results: EventResult = {
            events: events,
            blockingErrors: [...orgUnitError, ...periodError],
            nonBlockingErrors: [],
        };
        return Future.success(results);
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
}
