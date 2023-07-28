import { Id } from "./Ref";

export type SignalStatusTypes = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export interface Signal {
    id: Id;
    eventId: Id;
    module: string;
    orgUnit: string;
    creationDate: string;
    status: SignalStatusTypes;
    statusHistory: SignalStatusHistoryType[];
}

type SignalStatusHistoryType = {
    from?: SignalStatusTypes;
    to: SignalStatusTypes;
    changedAt: string;
};
