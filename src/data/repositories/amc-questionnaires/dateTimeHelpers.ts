import moment from "moment";

export function getISODateAsLocaleDateString(date: string): Date {
    return moment.utc(date).local().toDate();
}

export function getCurrentTimeString(): string {
    return new Date().getTime().toString();
}

export function getIsoDateForPeriod(period: string): string {
    const now = new Date();
    const date = new Date(
        Number(period),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
    );

    return date.toISOString().slice(0, 19);
}
