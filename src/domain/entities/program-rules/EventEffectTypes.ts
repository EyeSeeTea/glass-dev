import { D2ProgramRuleAction, D2ProgramRuleVariable, MetadataPick } from "@eyeseetea/d2-api/2.34";
import { Id } from "../Ref";
import { TrackerEventsPostRequest } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import { ConsistencyError } from "../data-entry/ImportSummary";
import { D2TrackerEvent as Event } from "@eyeseetea/d2-api/api/trackerEvents";
export const metadataQuery = {
    programs: {
        fields: {
            id: true,
            name: true,
            programType: true,
            programTrackedEntityAttributes: {
                trackedEntityAttribute: {
                    id: true,
                    name: true,
                    valueType: true,
                    optionSet: { id: true },
                },
            },
            programStages: {
                id: true,
                name: true,
                programStageDataElements: {
                    dataElement: { id: true },
                },
            },
        },
    },
    dataElements: {
        fields: { id: true, name: true, valueType: true, optionSet: { id: true } },
    },
    programRules: {
        fields: {
            id: true,
            condition: true,
            displayName: true,
            program: { id: true },
            programRuleActions: { $owner: true },
        },
    },
    programRuleVariables: {
        fields: {
            $owner: true,
            displayName: true,
            dataElement: { id: true, valueType: true },
            trackedEntityAttribute: { id: true, valueType: true },
        },
    },
    optionSets: {
        fields: {
            id: true,
            displayName: true,
            options: { id: true, code: true, displayName: true },
        },
    },
    constants: {
        fields: { id: true, displayName: true, value: true },
    },
} as const;

type MetadataQuery = typeof metadataQuery;
type BaseMetadata = MetadataPick<MetadataQuery>;
type D2ProgramRuleVariableBase = BaseMetadata["programRuleVariables"][number];
type D2DataElement = BaseMetadata["dataElements"][number];

interface D2ProgramRuleVariableWithValueType extends D2ProgramRuleVariableBase {
    // Present from2.38
    valueType?: string;
}

export interface EGASPProgramMetadata extends MetadataPick<MetadataQuery> {
    programRuleVariables: D2ProgramRuleVariableWithValueType[];
    dataElementsById: Record<Id, D2DataElement>;
}

// interface D2Event extends Event {
//     trackedEntityInstance: Id | undefined;
//     enrollment?: Id;
//     enrollmentStatus: "ACTIVE" | "COMPLETED" | "CANCELLED";
// }

export type Program = EGASPProgramMetadata["programs"][number];
export type RuleEffect = RuleEffectAssign | RuleEffectShowError | RuleEffectShowWarn | RuleEffectOther;

export interface RuleEffectAssign {
    type: "ASSIGN";
    id: Id;
    targetDataType?: "dataElement" | "trackedEntityAttribute";
    value: string | undefined;
}

export interface RuleEffectShowError {
    type: "SHOWERROR";
    message?: string;
    error: {
        message: string;
        id: string;
    };
}

export interface RuleEffectShowWarn {
    type: "SHOWWARNING";
    message?: string;
    warning: {
        message: string;
        id: string;
    };
}

export interface RuleEffectOther {
    type: "HIDEFIELD" | "HIDEOPTION" | "HIDEOPTIONGROUP" | "HIDESECTION" | "SETMANDATORYFIELD";
}
export interface OrgUnit extends IdNameCode {
    groups: IdNameCode[];
}

export interface IdNameCode {
    id: Id;
    name: string;
    code: string;
}

export interface EventEffect {
    program: Program;
    event: Event;
    events: Event[];
    effects: RuleEffect[];
    orgUnit: OrgUnit;
}

export interface ActionResult {
    actions: UpdateActionEvent[];
    blockingErrors: ConsistencyError[];
    nonBlockingErrors: ConsistencyError[];
}

export interface EventResult {
    events: Event[];
    blockingErrors: ConsistencyError[];
    nonBlockingErrors: ConsistencyError[];
}

export type UpdateAction = UpdateActionEvent;
type NamedRef = { id: Id; name: string };
export interface UpdateActionEvent {
    type: "event";
    eventId: Id;
    trackedEntityId?: Id;
    program: NamedRef;
    programStage?: NamedRef;
    orgUnit: NamedRef;
    dataElement: NamedRef;
    value: string;
    valuePrev: string;
}

export type D2EventToPost = TrackerEventsPostRequest["events"][number];
export type D2DataValueToPost = D2EventToPost["dataValues"][number];
export declare type EventStatus = "ACTIVE" | "COMPLETED" | "VISITED" | "SCHEDULED" | "OVERDUE" | "SKIPPED";
export interface ProgramRuleEvent {
    eventId: Id;
    programId?: Id;
    programStageId?: Id;
    orgUnitId: Id;
    orgUnitName: string;
    trackedEntityId?: Id | undefined;
    enrollmentId?: Id;
    enrollmentStatus?: "ACTIVE" | "COMPLETED" | "CANCELLED";
    status?: EventStatus;
    eventDate?: string;
    occurredAt?: string;
    scheduledAt?: string;
}

type Expression = string;

export interface ProgramRule {
    id: Id;
    condition: Expression;
    displayName: string;
    programId: Id;
    programRuleActions: ProgramRuleAction[];
}

export interface ProgramRuleAction {
    id: string;
    content?: string;
    displayContent?: string;
    data?: Expression;
    location?: string;
    programRuleActionType: D2ProgramRuleAction["programRuleActionType"];
    dataElementId?: Id;
    programStageId?: Id;
    programStageSectionId?: Id;
    trackedEntityAttributeId?: Id;
    optionGroupId?: Id;
    optionId?: Id;
    style?: object;
}
export interface Constant {
    id: Id;
    displayName: string;
    value: number;
}
export interface ProgramRulesContainer {
    programRuleVariables: ProgramRuleVariable[];
    programRules: ProgramRule[];
    constants: Constant[];
}
export interface ProgramRuleVariable {
    id: Id;
    displayName: string;
    programRuleVariableSourceType: D2ProgramRuleVariable["programRuleVariableSourceType"];
    // valueType is present in capture-app type. This field was added on 2.38, and its value
    // depends on the source type: dataElement, TEA, or Calculated Value.
    valueType: string;
    programId: Id;
    dataElementId?: Id;
    trackedEntityAttributeId?: Id;
    programStageId?: Id;
    useNameForOptionSet?: boolean;
}
type IdMap<T> = Record<Id, T>;

export type DataElement = {
    id: Id;
    valueType: D2DataElement["valueType"];
    optionSetId?: Id;
};

export type DataElementsMap = IdMap<DataElement>;
export interface OptionSet {
    id: Id;
    displayName: string;
    options: Array<{ id: Id; code: string; displayName: string }>;
}
export type OptionSetsMap = IdMap<OptionSet>;

export interface GetProgramRuleEffectsOptions {
    programRulesContainer: ProgramRulesContainer;
    currentEvent?: ProgramRuleEvent;
    otherEvents?: ProgramRuleEvent[];
    dataElements: DataElementsMap;

    selectedOrgUnit: OrgUnit;
    optionSets: OptionSetsMap;
}
