import { Id, NamedRef } from "./Ref";

export type SignalStatusTypes = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export interface Signal {
    id: Id;
    eventId: Id;
    module: string;
    orgUnit: NamedRef;
    levelOfConfidentiality: "CONFIDENTIAL" | "NONCONFIDENTIAL";
    creationDate: string;
    status: SignalStatusTypes;
    statusHistory: SignalStatusHistoryType[];
    userHasDeletePermission?: boolean;
}

type SignalStatusHistoryType = {
    from?: SignalStatusTypes;
    to: SignalStatusTypes;
    changedAt: string;
};
