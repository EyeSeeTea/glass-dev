import { Id } from "./Ref";

export type DataSubmissionStatusTypes =
    | "NOT_COMPLETED"
    | "COMPLETE"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "REJECTED"
    | "PENDING_UPDATE_APPROVAL"
    | "UPDATE_REQUEST_ACCEPTED";

export interface GlassDataSubmission {
    id: Id;
    module: string;
    orgUnit: string;
    period: string;
    status: DataSubmissionStatusTypes;
    statusHistory: StatusHistoryType[];
}

export type StatusHistoryType = {
    from?: DataSubmissionStatusTypes;
    to: DataSubmissionStatusTypes;
    changedAt: string;
};
