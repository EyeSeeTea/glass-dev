import { D2Api } from "../../types/d2-api";
import { CaptureFormRepository } from "../../domain/repositories/CaptureFormRepository";
import { FutureData, Future } from "../../domain/entities/Future";
import {
    BooleanQuestion,
    DateQuestion,
    NumberQuestion,
    Question,
    Questionnaire,
    SelectQuestion,
    SingleCheckQuestion,
    TextQuestion,
} from "../../domain/entities/Questionnaire";
import { apiToFuture } from "../../utils/futures";
import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";
import { Id } from "../../domain/entities/Ref";

interface EARProgram {
    code: string;
    id: string;
    name: string;
}

interface ProgramStageSections {
    id: string;
    name: string;
    dataElements: { id: string }[];
}

interface EARDataElements {
    code: string;
    id: string;
    formName: string;
    valueType: string;
    optionSet?: { id: string };
}

interface OptionSet {
    id: string;
    name: string;
    options: { id: string };
}
interface Option {
    id: string;
    name: string;
    code: string;
    optionSet: { id: string };
}
export interface ProgramMetadata {
    programs: EARProgram[];
    programStageSections: ProgramStageSections[];
    dataElements: EARDataElements[];
    optionSets: OptionSet[];
    options: Option[];
}

export class CaptureFormDefaultRepository implements CaptureFormRepository {
    constructor(private api: D2Api) {}

    getForm(programId: Id): FutureData<Questionnaire> {
        return apiToFuture(
            this.api.request<ProgramMetadata>({
                method: "get",
                url: `/programs/${programId}/metadata.json?fields=programs,dataElements,programStageSections`,
            })
        ).flatMap(resp => {
            if (resp.programs[0]) {
                const form: Questionnaire = {
                    id: resp.programs[0].id,
                    name: resp.programs[0].name,
                    description: resp.programs[0].name,
                    orgUnit: { id: "" },
                    year: "",
                    isCompleted: false,
                    isMandatory: false,
                    rules: [],
                    sections: resp.programStageSections.map(section => {
                        const questions: Question[] = this.mapProgramDataElementToQuestions(
                            section,
                            resp.dataElements,
                            resp.options
                        );

                        return {
                            title: section.name,
                            code: section.id,
                            questions: questions,
                            isVisible: true,
                        };
                    }),
                };

                return Future.success(form);
            } else {
                return Future.error("Program not found");
            }
        });
    }

    getPopulatedForm(event: D2TrackerEvent, programId: string): FutureData<Questionnaire> {
        return apiToFuture(
            this.api.request<ProgramMetadata>({
                method: "get",
                url: `/programs/${programId}/metadata.json?fields=programs,dataElements,programStageSections`,
            })
        ).flatMap(resp => {
            if (resp.programs[0]) {
                const form: Questionnaire = {
                    id: resp.programs[0].id,
                    name: resp.programs[0].name,
                    description: resp.programs[0].name,
                    orgUnit: { id: "" },
                    year: "",
                    isCompleted: false,
                    isMandatory: false,
                    rules: [],
                    sections: resp.programStageSections.map(section => {
                        const questions: Question[] = this.mapProgramDataElementToQuestions(
                            section,
                            resp.dataElements,
                            resp.options,
                            event
                        );

                        return {
                            title: section.name,
                            code: section.id,
                            questions: questions,
                            isVisible: true,
                        };
                    }),
                };

                return Future.success(form);
            } else {
                return Future.error("Program not found");
            }
        });
    }

    private mapProgramDataElementToQuestions(
        section: ProgramStageSections,
        dataElements: EARDataElements[],
        options: Option[],
        event: D2TrackerEvent | undefined = undefined
    ): Question[] {
        const questions: Question[] = _.compact(
            section.dataElements.map(dataElement => {
                const curDataElement = dataElements.filter(de => de.id === dataElement.id);

                if (curDataElement[0]) {
                    const curDE = curDataElement[0];
                    const dataValue = event ? event.dataValues.find(dv => dv.dataElement === curDE.id) : undefined;
                    switch (curDE.valueType) {
                        case "BOOLEAN": {
                            const boolQ: BooleanQuestion = {
                                id: curDE.id,
                                code: curDE.code, //code
                                text: curDE.formName, //formName
                                type: "boolean",
                                storeFalse: true,
                                value: dataValue ? (dataValue.value === "true" ? true : false) : true,
                            };

                            return boolQ;
                        }

                        case "NUMBER": {
                            const intQ: NumberQuestion = {
                                id: curDE.id,
                                code: curDE.code, //code
                                text: curDE.formName, //formName
                                type: "number",
                                numberType: "INTEGER",
                                value: dataValue ? dataValue.value : "",
                            };

                            return intQ;
                        }

                        case "TRUE_ONLY": {
                            const singleCheckQ: SingleCheckQuestion = {
                                id: curDE.id,
                                code: curDE.code, //code
                                text: curDE.formName, //formName
                                type: "singleCheck",
                                storeFalse: true,
                                value: dataValue ? (dataValue.value === "true" ? true : false) : false,
                            };

                            return singleCheckQ;
                        }

                        case "TEXT": {
                            if (curDE.optionSet) {
                                const selectOptions = options.filter(op => op.optionSet.id === curDE.optionSet?.id);

                                const selectedOption = dataValue
                                    ? selectOptions.find(o => o.code === dataValue.value)
                                    : undefined;

                                const selectQ: SelectQuestion = {
                                    id: curDE.id || "",
                                    code: curDE.code || "",
                                    text: curDE.formName || "",
                                    type: "select",
                                    options: selectOptions,
                                    value: selectedOption ? selectedOption : { name: "", id: "", code: "" },
                                };
                                return selectQ;
                            } else {
                                const singleLineText: TextQuestion = {
                                    id: curDE.id,
                                    code: curDE.code,
                                    text: curDE.formName,
                                    type: "text",
                                    value: dataValue ? (dataValue.value as string) : "",
                                    multiline: false,
                                };

                                return singleLineText;
                            }
                        }

                        case "LONG_TEXT": {
                            const singleLineTextQ: TextQuestion = {
                                id: curDE.id,
                                code: curDE.code,
                                text: curDE.formName,
                                type: "text",
                                value: dataValue ? (dataValue.value as string) : "",
                                multiline: true,
                            };

                            return singleLineTextQ;
                        }

                        case "DATE": {
                            const dateQ: DateQuestion = {
                                id: curDE.id,
                                code: curDE.code,
                                text: curDE.formName,
                                type: "date",
                                value: dataValue ? new Date(dataValue.value as string) : new Date(),
                            };

                            return dateQ;
                        }
                    }
                }
            })
        );

        return questions;
    }

    getSignalEvent(eventId: string): FutureData<D2TrackerEvent> {
        return apiToFuture(
            this.api.tracker.events.getById(eventId, {
                fields: { dataValues: true },
            })
        ).flatMap(resp => {
            return Future.success(resp);
        });
    }
}
