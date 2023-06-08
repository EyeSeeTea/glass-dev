//
/* eslint-disable class-methods-use-this */
import log from "loglevel";
import moment from "moment";
import { systemSettingsStore } from "../systemSettings.store";
const dateMomentFormat = "YYYY-MM-DD";

export function convertMomentToDateFormatString(moment) {
    const dateFormat = systemSettingsStore.get().dateFormat;
    const formattedDateString = moment.format(dateFormat);
    return formattedDateString;
}

class RulesValueConverter {
    convertText(value) {
        return value;
    }

    convertLongText(value) {
        return value;
    }

    convertLetter(value) {
        return value;
    }

    convertPhoneNumber(value) {
        return value;
    }

    convertEmail(value) {
        return value;
    }

    convertBoolean(value) {
        return value ? "true" : "false";
    }

    convertTrueOnly() {
        return "true";
    }

    convertDate(value) {
        const momentDate = moment(value, dateMomentFormat);
        return convertMomentToDateFormatString(momentDate);
    }

    convertDateTime(value) {
        const momentDateTime = moment(value);
        return {
            date: convertMomentToDateFormatString(momentDateTime),
            time: momentDateTime.format("HH:mm"),
        };
    }

    convertTime(value) {
        return value;
    }

    convertNumber(value) {
        return value.toString();
    }

    convertUnitInterval(value) {
        return value.toString();
    }

    convertPercentage(value) {
        return value.toString();
    }

    convertInteger(value) {
        return value.toString();
    }

    convertIntegerPositive(value) {
        return value.toString();
    }

    convertIntegerNegative(value) {
        return value.toString();
    }

    convertIntegerZeroOrPositive(value) {
        return value.toString();
    }

    convertTrackerAssociate(value) {
        log.warn("convertTrackerAssociate not implemented", value);
        return "";
    }

    convertUserName(value) {
        log.warn("convertUserName not implemented", value);
        return "";
    }

    convertCoordinate(value) {
        log.warn("convertCoordinate not implemented", value);
        return "";
    }

    convertOrganisationUnit(value) {
        log.warn("convertOrganisationUnit not implemented", value);
        return "";
    }

    convertAge(value) {
        const now = moment();
        const age = moment(value, dateMomentFormat);

        const years = now.diff(age, "years");
        age.add(years, "years");

        const months = now.diff(age, "months");
        age.add(months, "months");

        const days = now.diff(age, "days");

        return {
            date: convertMomentToDateFormatString(moment(value, dateMomentFormat)),
            years: years.toString(),
            months: months.toString(),
            days: days.toString(),
        };
    }

    convertUrl(value) {
        return value;
    }

    convertFile(value) {
        log.warn("convertFile not implemented", value);
        return "";
    }

    convertImage(value) {
        log.warn("convertImage not implemented", value);
        return "";
    }
}

export const outputConverter = new RulesValueConverter();
