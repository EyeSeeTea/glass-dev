import { Id } from "./Ref";

export type CallStatusTypes =
    | "NOT_COMPLETED"
    | "COMPLETE"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "REJECTED"
    | "PENDING_UPDATE_APPROVAL";

export interface GlassCall {
    id: Id;
    module: string;
    orgUnit: string;
    period: number;
    status: CallStatusTypes;
}
