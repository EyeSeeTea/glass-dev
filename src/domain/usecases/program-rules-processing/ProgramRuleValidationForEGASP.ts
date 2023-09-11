import {
    ActionResult,
    D2DataValueToPost,
    D2EventToPost,
    EGASPProgramMetadata,
    EventEffect,
    EventResult,
    GetProgramRuleEffectsOptions,
    OrgUnit,
    Program,
    ProgramRuleEvent,
    ProgramRuleVariable,
    RuleEffect,
    UpdateAction,
    UpdateActionEvent,
} from "../../entities/program-rules/EventEffectTypes";
import { D2TrackerEvent as Event } from "@eyeseetea/d2-api/api/trackerEvents";
import { ProgramRulesMetadataRepository } from "../../repositories/program-rules/ProgramRulesMetadataRepository";
import { Id } from "../../entities/Ref";
import { Future, FutureData } from "../../entities/Future";

import { fromPairs } from "../../../types/utils";
import { RulesEngine } from "./RulesEngine";
import { inputConverter } from "./converters/inputConverter";
import { outputConverter } from "./converters/outputConverter";
import { dateUtils } from "./converters/dateUtils";
import { BlockingError, NonBlockingError } from "../../entities/data-entry/ImportSummary";

export class ProgramRuleValidationForEGASP {
    constructor(private programRulesMetadataRepository: ProgramRulesMetadataRepository) {}

    public getValidatedEvents(events: Event[]): FutureData<EventResult> {
        return this.programRulesMetadataRepository.getMetadata().flatMap(metadata => {
            const eventEffects = this.getEventEffectsForEGASP(events, metadata);
            const actionsResult = this.getActions(eventEffects, metadata);
            if (actionsResult.blockingErrors.length > 0) {
                //If there are blocking errors, do not process further. return the errors.
                const errors: EventResult = {
                    events: [],
                    blockingErrors: actionsResult.blockingErrors,
                    nonBlockingErrors: actionsResult.nonBlockingErrors,
                };
                return Future.success(errors);
            } else {
                const eventsToBeUpdated = _.flatMap(eventEffects, eventEffect => eventEffect.events);
                const eventsById = _.keyBy(eventsToBeUpdated, "event");
                const eventsUpdated = this.getUpdatedEvents(actionsResult.actions, eventsById);
                const unChangedEvents = events.filter(e => !eventsUpdated.some(ue => ue.event === e.event));
                const consolidatedEvents = [...eventsUpdated, ...unChangedEvents];
                const results: EventResult = {
                    events: consolidatedEvents,
                    blockingErrors: [],
                    nonBlockingErrors: actionsResult.nonBlockingErrors,
                };
                return Future.success(results);
            }
        });
    }

    private getActions(eventEffects: EventEffect[], metadata: EGASPProgramMetadata): ActionResult {
        const updateActions: ActionResult = { actions: [], blockingErrors: [], nonBlockingErrors: [] };

        _(eventEffects)
            .flatMap(eventEffect => {
                return _(eventEffect.effects).flatMap(ruleEffect => {
                    const result = this.getUpdateAction(ruleEffect, eventEffect, metadata);

                    if (result?.type === "event") {
                        updateActions.actions.push(result);
                    } else if (result?.type === "blocking") {
                        updateActions.blockingErrors.push(result.error);
                    } else if (result?.type === "non-blocking") {
                        updateActions.nonBlockingErrors.push(result.error);
                    }
                });
            })
            .uniqWith(_.isEqual)
            .value();

        const uniqBlockingErrors = _(updateActions.blockingErrors).uniqWith(_.isEqual).groupBy("error").value();
        const uniqNonBlockingErrors = _(updateActions.nonBlockingErrors).uniqWith(_.isEqual).groupBy("error").value();
        const uniqActions = {
            actions: _(updateActions.actions).uniqWith(_.isEqual).value(),
            blockingErrors: Object.entries(uniqBlockingErrors).map(err => {
                return { error: err[0], count: err[1].length, lines: err[1].flatMap(a => (a.lines ? a.lines : [])) };
            }),
            nonBlockingErrors: Object.entries(uniqNonBlockingErrors).map(err => {
                return { error: err[0], count: err[1].length, lines: err[1].flatMap(a => (a.lines ? a.lines : [])) };
            }),
        };

        return uniqActions;
    }

    private getUpdateAction(
        effect: RuleEffect,
        eventEffect: EventEffect,
        metadata: EGASPProgramMetadata
    ): UpdateAction | BlockingError | NonBlockingError | undefined {
        const { program, event } = eventEffect;

        switch (effect.type) {
            case "ASSIGN": {
                console.debug(`Effect ${effect.type} ${effect.targetDataType}:${effect.id} -> ${effect.value}`);

                switch (effect.targetDataType) {
                    case "dataElement":
                        return this.getUpdateActionEvent(metadata, program, event, effect.id, effect.value);
                    default:
                        return;
                }
            }
            case "SHOWERROR": {
                const error: BlockingError = {
                    type: "blocking",
                    error: {
                        error: effect.message ? effect.message : effect.error?.message,
                        count: 1,
                        lines: [parseInt(event.event)],
                    },
                };
                return error;
            }

            case "SHOWWARNING": {
                const error: NonBlockingError = {
                    type: "non-blocking",
                    error: {
                        error: effect.message ? effect.message : effect.warning?.message,
                        count: 1,
                        lines: [parseInt(event.event)],
                    },
                };
                return error;
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
            trackedEntityId: event.trackedEntity || "",
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
            .filter(ev => Boolean(ev.occurredAt))
            .groupBy(ev => [ev.orgUnit, ev.program, ev.attributeOptionCombo, ev.trackedEntity].join("."))
            .values()
            .value();

        const programRulesIds: Id[] = metadata.programRules.map(pr => pr.id);

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
        const trackedEntityId = event.trackedEntity;

        return {
            eventId: event.event,
            programId: event.program,
            programStageId: event.programStage,
            orgUnitId: event.orgUnit,
            orgUnitName: event.orgUnit,
            enrollmentId: undefined,
            enrollmentStatus: undefined,
            status: event.status,
            occurredAt: event.occurredAt,
            scheduledAt: event.occurredAt,
            trackedEntityId,
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
        const rulesEngine = new RulesEngine(inputConverter, outputConverter, dateUtils, "WebClient");
        return rulesEngine.getProgramRuleEffects(options);
    }
}
