export type DataSubmissionStatusTypes =
    | "NOT_COMPLETED"
    | "COMPLETE"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "REJECTED"
    | "PENDING_UPDATE_APPROVAL";

export interface GlassDataSubmission {
    module: string;
    orgUnit: string;
    period: number;
    status: DataSubmissionStatusTypes;
}
