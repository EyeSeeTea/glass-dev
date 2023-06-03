import {
    D2DataValueToPost,
    D2EventToPost,
    EGASPProgramMetadata,
    EventEffect,
    GetProgramRuleEffectsOptions,
    OrgUnit,
    Program,
    ProgramRuleEvent,
    ProgramRuleVariable,
    RuleEffect,
    UpdateAction,
    UpdateActionEvent,
} from "../../entities/egasp-validate/eventEffectTypes";
import { Event } from "../../../data/repositories/Dhis2EventsDefaultRepository";
import { EGASPValidationRepository } from "../../repositories/egasp-validate/EGASPValidationRepository";
import { Id } from "../../entities/Ref";
import { Future, FutureData } from "../../entities/Future";

import { fromPairs } from "../../../types/utils";
import { RulesEngine } from "./RulesEngine";
import { inputConverter } from "./converters/inputConverter";
import { outputConverter } from "./converters/outputConverter";
import { dateUtils } from "./converters/dateUtils";

export class EventValidationForEGASP {
    constructor(private eGASPProgramRepository: EGASPValidationRepository) {}

    public getValidatedEvents(events: Event[]): FutureData<Event[]> {
        return this.eGASPProgramRepository.getMetadata().flatMap(metadata => {
            const eventEffects = this.getEventEffectsForEGASP(events, metadata);
            const actions = this.getActions(eventEffects, metadata);
            const eventsToBeUpdated = _.flatMap(eventEffects, eventEffect => eventEffect.events);
            const eventsById = _.keyBy(eventsToBeUpdated, "event");
            const eventsUpdated = this.getUpdatedEvents(actions, eventsById);
            const unChangedEvents = events.filter(e => !eventsUpdated.some(ue => ue.event === e.event));
            return Future.success([...eventsUpdated, ...unChangedEvents]);
        });
    }

    private getActions(eventEffects: EventEffect[], metadata: EGASPProgramMetadata): UpdateAction[] {
        return _(eventEffects)
            .flatMap(eventEffect => {
                return _(eventEffect.effects)
                    .flatMap(ruleEffect => this.getUpdateAction(ruleEffect, eventEffect, metadata))
                    .compact()
                    .value();
            })
            .uniqWith(_.isEqual)
            .value();
    }

    private getUpdateAction(
        effect: RuleEffect,
        eventEffect: EventEffect,
        metadata: EGASPProgramMetadata
    ): UpdateAction | undefined {
        const { program, event } = eventEffect;

        switch (effect.type) {
            case "ASSIGN":
                console.debug(`Effect ${effect.type} ${effect.targetDataType}:${effect.id} -> ${effect.value}`);

                switch (effect.targetDataType) {
                    case "dataElement":
                        return this.getUpdateActionEvent(metadata, program, event, effect.id, effect.value);

                    // case "trackedEntityAttribute":
                    //     if (!tei) {
                    //         log.error("No TEI to assign effect to");
                    //         return [];
                    //     } else {
                    //         return _.compact([getUpdateActionTeiAttribute(program, event, tei, effect)]);
                    //     }
                    default:
                        return;
                }
            default:
                return;
        }
    }

    private getUpdateActionEvent(
        metadata: EGASPProgramMetadata,
        program: Program,
        event: Event,
        dataElementId: Id,
        value: D2DataValueToPost["value"] | undefined | null
    ): UpdateActionEvent | undefined {
        const dataElementsById = _.keyBy(metadata.dataElements, de => de.id);
        const programStagesNamedRefById = _.keyBy(program.programStages, programStage => programStage.id);

        const strValue = value === null || value === undefined ? "" : value.toString();

        return {
            type: "event",
            eventId: event.event || "",
            teiId: event.trackedEntityInstance,
            program,
            programStage: event.programStage ? programStagesNamedRefById[event.programStage] : undefined,
            orgUnit: { id: event.orgUnit, name: "" },
            dataElement: dataElementsById[dataElementId] || { id: dataElementId, name: "-" },
            value: strValue,
            valuePrev: event.dataValues.find(dv => dv.dataElement === dataElementId)?.value.toString() ?? "",
        };
    }

    private getUpdatedEvents(actions: UpdateAction[], eventsById: _.Dictionary<Event>): D2EventToPost[] {
        return _(actions)
            .uniqWith(_.isEqual)
            .map(action => (action.type === "event" ? action : null))
            .compact()
            .groupBy(action => action.eventId)
            .toPairs()
            .map(([eventId, actions]) => {
                const event = eventsById[eventId];
                if (!event) throw new Error(`Event not found: ${eventId}`);

                const eventUpdated = actions.reduce((accEvent, action): D2EventToPost => {
                    return event ? this.setDataValue(accEvent, action.dataElement.id, action.value) : accEvent;
                }, event as D2EventToPost);

                return eventUpdated;
            })
            .value();
    }

    private setDataValue(
        event: D2EventToPost,
        dataElementId: Id,
        value: D2DataValueToPost["value"] | undefined
    ): D2EventToPost {
        const hasValue = _(event.dataValues).some(dv => dv.dataElement === dataElementId);
        const newValue = value === undefined ? "" : value;
        if (!hasValue && !newValue) return event;

        const dataValuesUpdated = hasValue
            ? _(event.dataValues as D2DataValueToPost[])
                  .map(dv => (dv.dataElement === dataElementId ? { ...dv, value: newValue } : dv))
                  .value()
            : _(event.dataValues as D2DataValueToPost[])
                  .concat([{ dataElement: dataElementId, value: newValue }])
                  .value();

        return { ...event, dataValues: dataValuesUpdated };
    }

    public getEventEffectsForEGASP(events: Event[], metadata: EGASPProgramMetadata): EventEffect[] {
        const program = metadata.programs[0]; //EGASP PROGRAM
        const eventsGroups = _(events)
            .filter(ev => Boolean(ev.eventDate))
            .groupBy(ev => [ev.orgUnit, ev.program, ev.attributeOptionCombo, ev.trackedEntityInstance].join("."))
            .values()
            .value();
        console.debug(eventsGroups);

        const programRulesIds: Id[] = metadata.programRules.map(pr => pr.id);
        console.debug(`Program Rules Ids: ${programRulesIds}`);

        if (program) {
            const eventEffects = _(eventsGroups)
                .flatMap(events => {
                    return events.map(event => {
                        return this.getEffects({
                            event,
                            program,
                            programRulesIds,
                            metadata,
                            events,
                        });
                    });
                })
                .compact()
                .value();

            return eventEffects;
        } else return [];
    }

    private getEffects(options: {
        event: Event;
        program: Program;
        programRulesIds: Id[];
        metadata: EGASPProgramMetadata;

        events: Event[];
    }): EventEffect | undefined {
        const { event: d2Event, program, programRulesIds, metadata, events } = options;
        const allEvents = events.map(event => this.getProgramEvent(event, metadata));
        const event = this.getProgramEvent(d2Event, metadata);

        console.debug(`Process event: ${event.eventId}`);

        const selectedOrgUnit: OrgUnit = {
            id: event.orgUnitId,
            name: event.orgUnitName,
            code: "",
            groups: [],
        };
        const getEffectsOptions: GetProgramRuleEffectsOptions = {
            currentEvent: event,
            otherEvents: allEvents,
            programRulesContainer: {
                programRules: metadata.programRules
                    .filter(rule => !programRulesIds || programRulesIds.includes(rule.id))
                    .filter(rule => rule.program.id === program.id)
                    .map(rule => {
                        const actions = rule.programRuleActions.map(action => ({
                            ...action,
                            dataElementId: action.dataElement?.id,
                            programStageId: action.programStage?.id,
                            programStageSectionId: action.programStageSection?.id,
                            trackedEntityAttributeId: action.trackedEntityAttribute?.id,
                            optionGroupId: action.optionGroup?.id,
                            optionId: action.option?.id,
                        }));

                        return {
                            ...rule,
                            programId: rule.program.id,
                            programRuleActions: actions,
                        };
                    }),
                programRuleVariables: metadata.programRuleVariables
                    .filter(variable => variable.program.id === program.id)
                    .map(
                        (variable): ProgramRuleVariable => ({
                            ...variable,
                            programId: variable.program?.id,
                            dataElementId: variable.dataElement?.id,
                            trackedEntityAttributeId: variable.trackedEntityAttribute?.id,
                            programStageId: variable.programStage?.id,
                            // 2.38 has valueType. For older versions, get from DE/TEA.
                            valueType:
                                variable.valueType ||
                                variable.dataElement?.valueType ||
                                variable.trackedEntityAttribute?.valueType ||
                                "TEXT",
                        })
                    ),
                constants: metadata.constants,
            },
            dataElements: this.getMap(
                metadata.dataElements.map(dataElement => ({
                    id: dataElement.id,
                    valueType: dataElement.valueType,
                    optionSetId: dataElement.optionSet?.id,
                }))
            ),
            optionSets: this.getMap(metadata.optionSets),
            selectedOrgUnit,
        };

        const [effects, errors] = this.captureConsoleError(() => {
            return this.getProgramRuleEffects(getEffectsOptions);
        });

        if (errors) {
            console.error(
                _.compact(["Get effects [error]:", `eventId=${event.eventId}`, ":", errors.join(", ")]).join(" ")
            );

            // Skip effect if there were errors (as the engine still returns a value)
            return undefined;
        }

        console.debug(
            _.compact(["Get effects[results]:", `eventId=${event.eventId}`, `ASSIGNs: ${effects.length}`]).join(" ")
        );

        if (!_.isEmpty(effects)) {
            const eventEffect: EventEffect = {
                program,
                event: d2Event,
                events: events,
                effects,
                orgUnit: selectedOrgUnit,
            };

            return eventEffect;
        } else {
            return undefined;
        }
    }

    private getMap<Obj extends { id: Id }>(objs: Obj[] | undefined): Record<Id, Obj> {
        return _.keyBy(objs || [], obj => obj.id);
    }

    private captureConsoleError<U>(fn: () => U): [U, string[] | undefined] {
        const errors: string[] = [];
        const prevConsoleError = console.error;
        console.error = (msg: string) => errors.push(msg);
        const res = fn();
        console.error = prevConsoleError;
        return [res, errors.length > 0 ? errors : undefined];
    }

    private getProgramEvent(event: Event, metadata: EGASPProgramMetadata): ProgramRuleEvent {
        const teiId = event.trackedEntityInstance;

        return {
            eventId: event.event,
            programId: event.program,
            programStageId: event.programStage,
            orgUnitId: event.orgUnit,
            orgUnitName: event.orgUnit,
            enrollmentId: undefined,
            enrollmentStatus: undefined,
            status: event.status,
            eventDate: event.eventDate,
            occurredAt: event.eventDate,
            trackedEntityInstanceId: teiId,
            scheduledAt: event.eventDate,
            // Add data values: Record<DataElementId, Value>
            ...fromPairs(
                event.dataValues.map(dv => {
                    const dataElement = metadata.dataElementsById[dv.dataElement];
                    const valueType = dataElement?.valueType;
                    // program rule expressions expect booleans (true/false) not strings ('true'/'false')
                    const isBoolean = valueType && ["BOOLEAN", "TRUE_ONLY"].includes(valueType);
                    const value = isBoolean ? dv.value.toString() === "true" : dv.value;
                    return [dv.dataElement, value];
                })
            ),
        };
    }

    private getProgramRuleEffects(options: GetProgramRuleEffectsOptions): RuleEffect[] {
        console.debug(options);
        const rulesEngine = new RulesEngine(inputConverter, outputConverter, dateUtils, "WebClient");
        return rulesEngine.getProgramRuleEffects(options);
    }
}
