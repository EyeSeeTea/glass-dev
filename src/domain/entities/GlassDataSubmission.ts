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
    period: number;
    status: DataSubmissionStatusTypes;
}
