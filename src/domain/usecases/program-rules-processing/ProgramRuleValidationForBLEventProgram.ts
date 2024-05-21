import {
    ActionResult,
    D2DataValueToPost,
    D2EventToPost,
    BulkLoadMetadata,
    EventEffect,
    ValidationResult,
    GetProgramRuleEffectsOptions,
    OrgUnit,
    Program,
    ProgramRuleEvent,
    ProgramRuleVariable,
    RuleEffect,
    UpdateAction,
    UpdateActionEvent,
    TrackedEntityAttributeValuesMap,
    RuleEffectAssign,
    UpdateActionTeiAttribute,
} from "../../entities/program-rules/EventEffectTypes";
import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import { ProgramRulesMetadataRepository } from "../../repositories/program-rules/ProgramRulesMetadataRepository";
import { Id } from "../../entities/Ref";
import { Future, FutureData } from "../../entities/Future";

import { fromPairs, Maybe } from "../../../types/utils";
import { RulesEngine } from "./RulesEngine";
import { inputConverter } from "./converters/inputConverter";
import { outputConverter } from "./converters/outputConverter";
import { dateUtils } from "./converters/dateUtils";
import { BlockingError, NonBlockingError } from "../../entities/data-entry/ImportSummary";
import { Attribute, D2TrackerTrackedEntity } from "@eyeseetea/d2-api/api/trackerTrackedEntities";

export class ProgramRuleValidationForBLEventProgram {
    constructor(private programRulesMetadataRepository: ProgramRulesMetadataRepository) {}

    public getValidatedTeisAndEvents(
        programId: string,
        events?: D2TrackerEvent[],
        teis?: D2TrackerTrackedEntity[], //For tracker programs only
        currentProgramStage?: Id
    ): FutureData<ValidationResult> {
        return this.programRulesMetadataRepository.getMetadata(programId).flatMap(metadata => {
            return this.getEventEffects(metadata, events, teis, currentProgramStage).flatMap(eventEffects => {
                const actionsResult = this.getActions(eventEffects, metadata);
                if (actionsResult.blockingErrors.length > 0) {
                    //If there are blocking errors, do not process further. return the errors.
                    const errors: ValidationResult = {
                        teis: [],
                        events: [],
                        blockingErrors: actionsResult.blockingErrors,
                        nonBlockingErrors: actionsResult.nonBlockingErrors,
                    };
                    return Future.success(errors);
                } else {
                    const eventsToBeUpdated = _.flatMap(eventEffects, eventEffect => eventEffect.events);
                    const eventsById = _.keyBy(eventsToBeUpdated, "event");
                    const eventsUpdated = this.getUpdatedEvents(actionsResult.actions, eventsById);
                    const unChangedEvents = events?.filter(e => !eventsUpdated.some(ue => ue.event === e.event)) ?? [];
                    const consolidatedEvents = [...eventsUpdated, ...unChangedEvents];

                    const teisCurrent = teis ? teis : [];

                    const teisUpdated: D2TrackerTrackedEntity[] = this.getUpdatedTeis(
                        teisCurrent,
                        actionsResult.actions
                    );
                    const unchangedTeis = teisCurrent.filter(
                        tei => !teisUpdated.some(updatedTei => updatedTei.trackedEntity === tei.trackedEntity)
                    );
                    const consolidatedTeis = [...teisUpdated, ...unchangedTeis];
                    console.debug(`Changes: events=${eventsUpdated.length}, teis=${teisUpdated.length}`);

                    const results: ValidationResult = {
                        teis: consolidatedTeis,
                        events: consolidatedEvents,
                        blockingErrors: [],
                        nonBlockingErrors: actionsResult.nonBlockingErrors,
                    };
                    return Future.success(results);
                }
            });
        });
    }

    private getUpdatedTeis(teisCurrent: D2TrackerTrackedEntity[], actions: UpdateAction[]) {
        const teisUpdated: D2TrackerTrackedEntity[] = _(actions)
            .uniqWith(_.isEqual)
            .map(action => (action.type === "teiAttribute" ? action : null))
            .compact()
            .groupBy(action => action.teiId)
            .toPairs()
            .map(([teiId, actions]) => {
                const tei = teisCurrent.find(tei => tei.trackedEntity === teiId);
                if (!tei) throw new Error(`TEI not found: ${teiId}`);

                return actions.reduce((accTei, action): D2TrackerTrackedEntity => {
                    return this.setTeiAttributeValue(accTei, action.teiAttribute.id, action.value);
                }, tei);
            })
            .value();
        return teisUpdated;
    }

    private setTeiAttributeValue(
        tei: D2TrackerTrackedEntity,
        attributeId: Id,
        value: D2DataValueToPost["value"] | undefined
    ): D2TrackerTrackedEntity {
        const hasValue = _(tei.attributes).some(attr => attr.attribute === attributeId);
        const newValue = value === undefined ? "" : value.toString();
        if (!hasValue && !newValue) return tei;

        const attributesUpdated: Attribute[] = hasValue
            ? _(tei.attributes)
                  .map(dv => (dv.attribute === attributeId ? { ...dv, value: newValue } : dv))
                  .value()
            : _(tei.attributes)
                  .concat([{ attribute: attributeId, value: newValue }])
                  .value();

        return { ...tei, attributes: attributesUpdated };
    }

    private getActions(eventEffects: EventEffect[], metadata: BulkLoadMetadata): ActionResult {
        const updateActions: ActionResult = { actions: [], blockingErrors: [], nonBlockingErrors: [] };

        _(eventEffects)
            .flatMap(eventEffect => {
                return _(eventEffect.effects).flatMap(ruleEffect => {
                    const result = this.getUpdateAction(ruleEffect, eventEffect, metadata);

                    if (result?.type === "blocking") {
                        updateActions.blockingErrors.push(result.error);
                    } else if (result?.type === "non-blocking") {
                        updateActions.nonBlockingErrors.push(result.error);
                    } else if (result) {
                        updateActions.actions.push(result);
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
        metadata: BulkLoadMetadata
    ): UpdateAction | BlockingError | NonBlockingError | undefined {
        const { program, event, tei } = eventEffect;

        switch (effect.type) {
            case "ASSIGN": {
                console.debug(`Effect ${effect.type} ${effect.targetDataType}:${effect.id} -> ${effect.value}`);

                switch (effect.targetDataType) {
                    case "dataElement":
                        return this.getUpdateActionEvent(metadata, program, event, effect.id, effect.value);
                    case "trackedEntityAttribute": {
                        if (tei) return this.getUpdateActionTeiAttribute(program, event, tei, effect);
                        else return;
                    }
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
        metadata: BulkLoadMetadata,
        program: Program,
        event: D2TrackerEvent,
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

    private getUpdateActionTeiAttribute(
        program: Program,
        event: D2TrackerEvent,
        tei: D2TrackerTrackedEntity,
        ruleEffectAssign: RuleEffectAssign
    ): UpdateActionTeiAttribute | undefined {
        const { id: attributeId, value } = ruleEffectAssign;
        const attributes = _(program.programTrackedEntityAttributes)
            .flatMap(ptea => ptea.trackedEntityAttribute)
            .value();

        const attributesById = _.keyBy(attributes, de => de.id);
        const attributeIdsInProgram = new Set(attributes.map(de => de.id));
        const programStagesNamedRefById = _.keyBy(program.programStages, programStage => programStage.id);

        if (!attributeIdsInProgram.has(attributeId) || !tei.trackedEntity || !event.programStage) {
            console.debug(`Skip ASSIGN effect as attribute ${attributeId} does not belong to program`);
            return undefined;
        } else {
            const strValue = value === null || value === undefined ? "" : value.toString();
            return {
                type: "teiAttribute",
                eventId: event.event,
                teiId: tei.trackedEntity,
                program,
                programStage: programStagesNamedRefById[event.programStage],
                orgUnit: { id: tei.orgUnit ?? "", name: tei.orgUnit ?? "" },
                teiAttribute: attributesById[attributeId] || { id: attributeId, name: "-" },
                value: strValue,
                valuePrev: tei.attributes?.find(dv => dv.attribute === attributeId)?.value ?? "-",
            };
        }
    }

    private getUpdatedEvents(actions: UpdateAction[], eventsById: _.Dictionary<D2TrackerEvent>): D2EventToPost[] {
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

    public getEventEffects(
        metadata: BulkLoadMetadata,
        events?: D2TrackerEvent[],
        teis?: D2TrackerTrackedEntity[],
        currentProgramStage?: Id
    ): FutureData<EventEffect[]> {
        const program = metadata.programs[0];
        if (program) {
            switch (program.programType) {
                case "WITHOUT_REGISTRATION":
                    if (events) return Future.success(this.getEventEffectsForEventProgram(events, metadata));
                    else return Future.error("No events");

                case "WITH_REGISTRATION":
                    return this.getEventEffectsForTrackerProgram(teis, { program, metadata }, currentProgramStage);
            }
        } else return Future.error("Unknown program");
    }

    public getEventEffectsForEventProgram(events: D2TrackerEvent[], metadata: BulkLoadMetadata): EventEffect[] {
        const program = metadata.programs[0]; //EVENT PROGRAM
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

    private getEventEffectsForTrackerProgram(
        teis: D2TrackerTrackedEntity[] | undefined,
        options: { program: Program; metadata: BulkLoadMetadata },
        currentProgramStage?: Id
    ): FutureData<EventEffect[]> {
        const { program, metadata } = options;

        const programRulesIds: Id[] = currentProgramStage
            ? metadata.programRules.filter(pr => pr.programStage.id === currentProgramStage).map(pr => pr.id)
            : metadata.programRules.map(pr => pr.id);

        const eventEffects = _(teis)
            .flatMap(tei => {
                const teiEvents = _.flatMap(tei.enrollments, enrollment => enrollment.events);

                return teiEvents
                    .filter(event => Boolean(event?.occurredAt))
                    .map(event =>
                        event
                            ? this.getEffects({
                                  event,
                                  program,
                                  programRulesIds,
                                  metadata,
                                  events: teiEvents,
                                  teis,
                                  tei,
                              })
                            : null
                    );
            })
            .compact()
            .value();

        return Future.success(eventEffects);
    }

    private getEffects(options: {
        event: D2TrackerEvent;
        program: Program;
        programRulesIds: Id[];
        metadata: BulkLoadMetadata;
        events: D2TrackerEvent[];
        teis?: D2TrackerTrackedEntity[];
        tei?: Maybe<D2TrackerTrackedEntity>;
    }): EventEffect | undefined {
        const { event: d2Event, program, programRulesIds, metadata, events, teis, tei } = options;
        const allEvents = events.map(event => this.getProgramEvent(event, metadata));
        const event = this.getProgramEvent(d2Event, metadata);

        const enrollmentsById = _(teis)
            .flatMap(tei => tei.enrollments)
            .filter(enrollment => enrollment !== undefined)
            .compact()
            .keyBy(enrollment => enrollment.enrollment)
            .value();

        const enrollment = event.enrollmentId ? enrollmentsById[event.enrollmentId] : undefined;

        console.debug(`Process event: ${event.eventId}`);

        const selectedEntity: TrackedEntityAttributeValuesMap | undefined = tei
            ? _(tei.attributes)
                  .map(attr => [attr.attribute, attr.value] as [Id, string])
                  .fromPairs()
                  .value()
            : undefined;

        const selectedOrgUnit: OrgUnit = {
            id: event.orgUnitId,
            name: event.orgUnitName,
            code: "",
            groups: [],
        };
        const getEffectsOptions: GetProgramRuleEffectsOptions = {
            currentEvent: event,
            otherEvents: allEvents,
            trackedEntityAttributes: this.getMap(
                program.programTrackedEntityAttributes
                    .map(ptea => ptea.trackedEntityAttribute)
                    .map(tea => ({
                        id: tea.id,
                        valueType: tea.valueType,
                        optionSetId: tea.optionSet?.id,
                    }))
            ),
            selectedEnrollment: enrollment ? enrollment : undefined,
            selectedEntity,
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
                tei,
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

    private getProgramEvent(event: D2TrackerEvent, metadata: BulkLoadMetadata): ProgramRuleEvent {
        const trackedEntityId = event.trackedEntity;

        return {
            eventId: event.event,
            programId: event.program,
            programStageId: event.programStage,
            orgUnitId: event.orgUnit,
            orgUnitName: event.orgUnit,
            enrollmentId: event.enrollment,
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
