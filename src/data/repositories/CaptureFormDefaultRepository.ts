import { D2Api } from "../../types/d2-api";
import { CaptureFormRepository } from "../../domain/repositories/CaptureFormRepository";
import { FutureData, Future } from "../../domain/entities/Future";
import {
    BooleanQuestion,
    DateQuestion,
    Question,
    Questionnaire,
    SelectQuestion,
    TextQuestion,
} from "../../domain/entities/Questionnaire";
import { apiToFuture } from "../../utils/futures";
import { D2TrackerEvent } from "@eyeseetea/d2-api/api/trackerEvents";

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
export const EAR_PROGRAM_ID = "SQe26z0smFP";
export class CaptureFormDefaultRepository implements CaptureFormRepository {
    constructor(private api: D2Api) {}

    getForm(): FutureData<Questionnaire> {
        return apiToFuture(
            this.api.request<ProgramMetadata>({
                method: "get",
                url: `/programs/${EAR_PROGRAM_ID}/metadata.json?fields=programs,dataElements,programStageSections`,
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

    getPopulatedForm(event: D2TrackerEvent): FutureData<Questionnaire> {
        return apiToFuture(
            this.api.request<ProgramMetadata>({
                method: "get",
                url: `/programs/${EAR_PROGRAM_ID}/metadata.json?fields=programs,dataElements,programStageSections`,
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
                const curDataEleemnt = dataElements.filter(de => de.id === dataElement.id);

                if (curDataEleemnt[0]) {
                    const dataElement = curDataEleemnt[0];
                    const dataValue = event
                        ? event.dataValues.find(dv => dv.dataElement === dataElement.id)
                        : undefined;
                    switch (dataElement.valueType) {
                        case "BOOLEAN": {
                            const boolQ: BooleanQuestion = {
                                id: dataElement.id,
                                code: dataElement.code, //code
                                text: dataElement.formName, //formName
                                type: "boolean",
                                storeFalse: true,
                                value: dataValue ? (dataValue.value === "true" ? true : false) : true,
                            };

                            return boolQ;
                        }

                        case "TEXT": {
                            if (dataElement.optionSet) {
                                const selectOptions = options.filter(
                                    op => op.optionSet.id === dataElement.optionSet?.id
                                );

                                const selectedOption = dataValue
                                    ? selectOptions.find(o => o.code === dataValue.value)
                                    : undefined;

                                const selectQ: SelectQuestion = {
                                    id: dataElement.id || "",
                                    code: dataElement.code || "",
                                    text: dataElement.formName || "",
                                    type: "select",
                                    options: selectOptions,
                                    value: selectedOption ? selectedOption : { name: "", id: "", code: "" },
                                };
                                return selectQ;
                            } else {
                                const singleLineText: TextQuestion = {
                                    id: dataElement.id,
                                    code: dataElement.code,
                                    text: dataElement.formName,
                                    type: "text",
                                    value: dataValue ? (dataValue.value as string) : "",
                                    multiline: false,
                                };

                                return singleLineText;
                            }
                        }

                        case "LONG_TEXT": {
                            const singleLineTextQ: TextQuestion = {
                                id: dataElement.id,
                                code: dataElement.code,
                                text: dataElement.formName,
                                type: "text",
                                value: dataValue ? (dataValue.value as string) : "",
                                multiline: true,
                            };

                            return singleLineTextQ;
                        }

                        case "DATE": {
                            const dateQ: DateQuestion = {
                                id: dataElement.id,
                                code: dataElement.code,
                                text: dataElement.formName,
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
