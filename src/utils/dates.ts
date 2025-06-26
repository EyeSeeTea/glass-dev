import moment from "moment";

/**
 * Returns a formatted date string in the format YYYY-MM-DD using the current locale.
 * If the date is invalid, it returns an empty string.
 */
export function formatDate(date: Date): string {
    if (!date || isNaN(date.getTime())) return "";
    return moment(date).format("YYYY-MM-DD");
}

/**
 * Parses a date string in YYYY-MM-DD format using the current locale and returns a Date object.
 * @throws Error if the date string is invalid.
 */
export function parseDate(dateString: string): Date {
    const m = moment(dateString, "YYYY-MM-DD", true);
    if (!m.isValid()) {
        throw new Error(`Invalid date string: ${dateString}`);
    }
    return m.toDate();
}
