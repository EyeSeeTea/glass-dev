export type StatusCTAs =
    | "Upload dataset"
    | "Go to questionnaire"
    | "Send to WHO for revision"
    | "Display full status history";

export interface StatusDetails {
    title: string;
    description: string;
    colour: string;
    cta: StatusCTAs[];
}
