export type RouteOfAdministration = "oral" | "parenteral" | "rectal" | "inhalation power" | "inhalation solution";

export type RouteOfAdministrationKey = "O" | "P" | "R" | "IP" | "IS";

export const ROUTE_OF_ADMINISTRATION_MAPPING: Record<string, RouteOfAdministration> = {
    O: "oral",
    P: "parenteral",
    R: "rectal",
    IP: "inhalation power",
    IS: "inhalation solution",
};
