export type StatusCTAs =
    | "Upload dataset"
    | "Go to questionnaire"
    | "Send to WHO for revision"
    | "Display full status history";

export type Status =
    | "NOT_COMPLETED"
    | "COMPLETE"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "REJECTED"
    | "PENDING_UPDATE_APPROVAL";

export interface StatusDetails {
    title: string;
    description: string;
    colour: string;
    cta: StatusCTAs[];
}
