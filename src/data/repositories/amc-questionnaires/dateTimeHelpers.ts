import moment from "moment";

export function getISODateAsLocaleDateString(date: string): Date {
    return moment.utc(date).local().toDate();
}

export function getCurrentTimeString(): string {
    return new Date().getTime().toString();
}
