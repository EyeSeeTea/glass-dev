import i18n from "@eyeseetea/d2-ui-components/locales";
import { getId, Id } from "../../domain/entities/Base";
import { Future, FutureData } from "../../domain/entities/Future";
import { GlassModule } from "../../domain/entities/GlassModule";
import {
    Questionnaire,
    Question,
    QuestionnaireSection,
    QuestionnaireSelector,
    QuestionnaireBase,
    QuestionnarieM,
} from "../../domain/entities/Questionnaire";
import { QuestionnaireRepository } from "../../domain/repositories/QuestionnaireRepository";
import { D2Api, DataValueSetsDataValue, DataValueSetsPostRequest } from "../../types/d2-api";
import { assertUnreachable } from "../../types/utils";
import { apiToFuture } from "../../utils/futures";
import { DataElement } from "../dhis2/DataElement";
import { DataFormD2Source } from "../dhis2/DataFormD2Source";

export class QuestionnaireD2DefaultRepository implements QuestionnaireRepository {
    constructor(private api: D2Api) {}

    getDatasetList(
        module: GlassModule,
        options: { orgUnitId: Id; year: string },
        captureAccess: boolean
    ): FutureData<QuestionnaireBase[]> {
        const dataSetIds = module.questionnaires.map(getId);
        const configByDataSetId = _.keyBy(module.questionnaires, getId);

        const dataSets$ = apiToFuture(
            this.api.metadata.get({
                dataSets: {
                    fields: { id: true, displayName: true, displayDescription: true },
                    filter: { id: { in: dataSetIds } },
                },
            })
        ).map(res => res.dataSets);

        const data = {
            dataSets: dataSets$,
            dataSetsInfo: this.getDataSetsInfo(dataSetIds, options, captureAccess),
        };

        return Future.joinObj(data).map(({ dataSets, dataSetsInfo }) => {
            return dataSets.map((dataSet): QuestionnaireBase => {
                const dataSetInfo = dataSetsInfo.find(info => info.dataSet === dataSet.id);
                const config = configByDataSetId[dataSet.id];

                return {
                    id: dataSet.id,
                    name: dataSet.displayName,
                    orgUnit: { id: options.orgUnitId },
                    year: options.year,
                    description: dataSet.displayDescription,
                    isCompleted: dataSetInfo?.completed || false,
                    isMandatory: config?.mandatory || false,
                    rules: config?.rules || [],
                };
            });
        });
    }

    getProgramList(module: GlassModule, options: { orgUnitId: Id; year: string }): FutureData<QuestionnaireBase[]> {
        const ProgramIds = module.questionnaires.map(getId);
        const configByProgramId = _.keyBy(module.questionnaires, getId);

        return apiToFuture(
            this.api.metadata.get({
                programs: {
                    fields: { id: true, displayName: true, displayDescription: true },
                    filter: { id: { in: ProgramIds } },
                },
            })
        ).map(res => {
            const Qs = res.programs.map(program => {
                const config = configByProgramId[program.id];

                return {
                    id: program.id,
                    name: program.displayName,
                    orgUnit: { id: options.orgUnitId },
                    year: options.year,
                    description: program.displayDescription,
                    isCompleted: false,
                    isMandatory: config?.mandatory || false,
                    rules: [],
                };
            });

            return Qs;
        });
    }

    get(module: GlassModule, selector: QuestionnaireSelector, captureAccess: boolean): FutureData<Questionnaire> {
        const dataFormRepository = new DataFormD2Source(this.api);
        const config = module.questionnaires.find(q => q.id === selector.id);
        const dataForm$ = dataFormRepository.get({ id: selector.id });

        const dataValues$ = apiToFuture(
            this.api.dataValues.getSet({
                dataSet: [selector.id],
                orgUnit: [selector.orgUnitId],
                period: [selector.year.toString()],
            })
        ).map(res => res.dataValues);

        const data = {
            dataForm: dataForm$,
            dataValues: dataValues$,
            dataSetInfo: this.getDataSetsInfo([selector.id], selector, captureAccess).map(_.first),
        };

        return Future.joinObj(data).map(({ dataForm, dataValues, dataSetInfo }): Questionnaire => {
            const dataValuesByDataElementId = _.groupBy(dataValues, dv => dv.dataElement);

            const sections = dataForm.sections.map((section): QuestionnaireSection => {
                const questions = section.dataElements.map(dataElement => {
                    const dataValues = dataValuesByDataElementId[dataElement.id] || [];
                    return this.getQuestion(dataElement, dataValues);
                });

                return {
                    code: section.code,
                    title: section.name,
                    questions: _.compact(questions),
                    isVisible: true,
                };
            });

            const questionnaire: Questionnaire = {
                id: selector.id,
                name: dataForm.name,
                description: dataForm.description,
                orgUnit: { id: selector.orgUnitId },
                year: selector.year,
                sections: sections,
                isCompleted: dataSetInfo?.completed || false,
                isMandatory: config?.mandatory || false,
                rules: config?.rules || [],
            };

            return QuestionnarieM.applyRules(questionnaire);
        });
    }

    setCompletion(selector: QuestionnaireSelector, toBeCompleted: boolean): FutureData<void> {
        const validate$ = this.validateDataSet({
            dataSetId: selector.id,
            orgUnitId: selector.orgUnitId,
            period: selector.year.toString(),
        });

        const setCompletion$: FutureData<void> = apiToFuture(
            this.api.post<{ status: "OK" | "SUCCESS" | "WARNING" | "ERROR" }>(
                "/completeDataSetRegistrations",
                {},
                {
                    completeDataSetRegistrations: [
                        {
                            dataSet: selector.id,
                            period: selector.year.toString(),
                            organisationUnit: selector.orgUnitId,
                            completed: toBeCompleted,
                        },
                    ],
                }
            )
        ).flatMap(res =>
            res.status === "OK" || res.status === "SUCCESS"
                ? Future.success(undefined)
                : Future.error(i18n.t("Error saving registration status"))
        );

        if (toBeCompleted) {
            return validate$.flatMap(() => setCompletion$);
        } else {
            return setCompletion$;
        }
    }

    saveResponse(questionnaire: QuestionnaireSelector, question: Question): FutureData<void> {
        const dataValues = this.getDataValuesForQuestion(questionnaire, question);
        return this.postDataValues(dataValues);
    }

    private validateDataSet(options: { dataSetId: Id; period: string; orgUnitId: Id }): FutureData<void> {
        return this.getDataSetValidation(options).flatMap(validation => {
            const ruleIds = _(validation.validationRuleViolations)
                .map(validation => validation.validationRule.id)
                .uniq()
                .value();

            if (_.isEmpty(ruleIds)) {
                return Future.success(undefined);
            } else {
                return this.getValidationRules(ruleIds).flatMap(rules => {
                    const instructions = rules.map(rule => rule.instruction);
                    return Future.error(instructions.join("\n"));
                });
            }
        });
    }

    private getDataSetValidation(options: {
        dataSetId: Id;
        period: string;
        orgUnitId: Id;
    }): FutureData<DataSetValidationResponse> {
        const { dataSetId, period, orgUnitId } = options;

        return apiToFuture(
            this.api
                .get<DataSetValidationResponse>(`/validation/dataSet/${dataSetId}`, { pe: period, ou: orgUnitId })
                .map(response => response.data)
        );
    }

    private getValidationRules(ids: string[]): FutureData<ValidationRule[]> {
        return apiToFuture(
            this.api.metadata.get({
                validationRules: {
                    fields: { id: true, instruction: true },
                    filter: { id: { in: ids } },
                },
            })
        ).map(res => res.validationRules);
    }

    private getQuestion(dataElement: DataElement, dataValues: DataValueSetsDataValue[]): Question | null {
        const dataValue = _.first(dataValues);
        const { disaggregation } = dataElement;

        switch (dataElement.type) {
            case "BOOLEAN": {
                const isDefaultDisaggregation = disaggregation.length && disaggregation[0]?.name === "default";

                if (isDefaultDisaggregation) {
                    const stringToValue: Record<string, boolean> = { true: true, false: false };
                    const dataValue = dataValues.find(dv =>
                        _(dataElement.disaggregation).some(coc => dv.categoryOptionCombo === coc.id)
                    )?.value;

                    return {
                        id: dataElement.id,
                        code: dataElement.code,
                        text: dataElement.name,
                        type: "boolean",
                        value: dataValue ? stringToValue[dataValue] : undefined,
                        storeFalse: dataElement.storeFalse,
                    };
                } else {
                    return {
                        id: dataElement.id,
                        code: dataElement.code,
                        text: dataElement.name,
                        type: "select",
                        value: dataElement.disaggregation.find(coc =>
                            _(dataValues).some(dv => dv.value === "true" && dv.categoryOptionCombo === coc.id)
                        ),
                        options: dataElement.disaggregation,
                    };
                }
            }
            case "NUMBER":
                return {
                    id: dataElement.id,
                    code: dataElement.code,
                    text: dataElement.name,
                    type: "number",
                    value: dataValue?.value || "",
                    numberType: dataElement.numberType,
                };

            case "TEXT":
                return {
                    id: dataElement.id,
                    code: dataElement.code,
                    text: dataElement.name,
                    multiline: dataElement.multiline,
                    type: "text",
                    value: dataValue?.value || "",
                };

            default:
                console.error("Unsupported data element", dataElement);
                return null;
        }
    }

    private getDataValuesForQuestion(questionnaire: QuestionnaireSelector, question: Question): D2DataValue[] {
        const { type } = question;
        const { orgUnitId, year } = questionnaire;

        const base = {
            orgUnit: orgUnitId,
            dataElement: question.id,
            period: year.toString(),
        };

        switch (type) {
            case "select":
                return question.options.map((option): D2DataValue => {
                    const isSelected = question.value?.id === option.id;
                    return {
                        ...base,
                        value: isSelected ? "true" : "",
                        categoryOptionCombo: option.id,
                        ...deleted(!isSelected),
                    };
                });
            case "boolean": {
                const strValue = question.value ? "true" : question.storeFalse ? "false" : "";
                return [
                    {
                        ...base,
                        value: strValue,
                        ...deleted(!strValue),
                    },
                ];
            }
            case "number":
            case "text":
                return [
                    {
                        ...base,
                        value: question.value ?? "",
                        ...deleted(!question.value),
                    },
                ];
            case "date":
                return [
                    {
                        ...base,
                        value: question.value?.toISOString().split("T")?.at(0) ?? "",
                        ...deleted(!question.value),
                    },
                ];
            case "singleCheck": {
                const strValue = question.value ? "true" : question.storeFalse ? "false" : "";
                return [
                    {
                        ...base,
                        value: strValue,
                        ...deleted(!strValue),
                    },
                ];
            }
            default:
                assertUnreachable(type);
        }
    }

    private postDataValues(d2DataValues: D2DataValue[]): FutureData<void> {
        return apiToFuture(this.api.dataValues.postSet({}, { dataValues: d2DataValues })).flatMap(res => {
            const status = res.status as string;
            return status === "OK" || status === "SUCCESS" ? Future.success(undefined) : Future.error(res.status);
        });
    }

    private getDataSetsInfo(
        ids: Id[],
        options: { orgUnitId: Id; year: string },
        captureAccess: boolean
    ): FutureData<CompleteDataSetRegistration[]> {
        if (_.isEmpty(ids) || !captureAccess) return Future.success([]);

        return apiToFuture(
            this.api.get<CompleteDataSetRegistrationsResponse>("/completeDataSetRegistrations", {
                dataSet: ids,
                orgUnit: options.orgUnitId,
                period: options.year.toString(),
            })
        ).map(res => res.completeDataSetRegistrations || []);
    }
}

function deleted(value: boolean): { deleted: true } | {} {
    return value ? { deleted: true } : {};
}

type D2ApiDataValue = DataValueSetsPostRequest["dataValues"][number];

interface D2DataValue extends D2ApiDataValue {
    deleted?: boolean;
}

interface CompleteDataSetRegistration {
    period: string;
    dataSet: Id;
    organisationUnit: Id;
    attributeOptionCombo: Id;
    date: string;
    storedBy: string;
    completed: boolean;
}

interface CompleteDataSetRegistrationsResponse {
    completeDataSetRegistrations?: CompleteDataSetRegistration[];
}

interface ValidationRule {
    id: Id;
    instruction: string;
}

interface DataSetValidationResponse {
    validationRuleViolations: Array<{
        id: number;
        validationRule: {
            name: string;
            id: Id;
        };
        period: {
            code: string;
            name: string;
            id: string;
        };
        organisationUnit: {
            code: string;
            name: string;
            id: Id;
        };
        attributeOptionCombo: {
            code: string;
            name: string;
            id: Id;
        };
        leftsideValue: number;
        rightsideValue: number;
        dayInPeriod: number;
        notificationSent: boolean;
    }>;
    commentRequiredViolations: unknown[];
}
