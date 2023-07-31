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
import { Event } from "./Dhis2EventsDefaultRepository";

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
const EAR_PROGRAM_ID = "SQe26z0smFP";
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

    private mapProgramDataElementToQuestions(
        section: ProgramStageSections,
        dataElements: EARDataElements[],
        options: Option[]
    ): Question[] {
        const questions: Question[] = _.compact(
            section.dataElements.map(dataElement => {
                const curDataElement = dataElements.filter(de => de.id === dataElement.id);

                if (curDataElement[0]) {
                    switch (curDataElement[0].valueType) {
                        case "BOOLEAN": {
                            const boolQ: BooleanQuestion = {
                                id: curDataElement[0].id,
                                code: curDataElement[0].code, //code
                                text: curDataElement[0].formName, //formName
                                type: "boolean",
                                storeFalse: true,
                                value: true,
                            };

                            return boolQ;
                        }

                        case "TEXT": {
                            if (curDataElement[0].optionSet) {
                                const selectOptions = options.filter(
                                    op => op.optionSet.id === curDataElement[0]?.optionSet?.id
                                );

                                const selectQ: SelectQuestion = {
                                    id: curDataElement[0]?.id || "",
                                    code: curDataElement[0]?.code || "",
                                    text: curDataElement[0]?.formName || "",
                                    type: "select",
                                    options: selectOptions,
                                    value: { name: "", id: "", code: "" },
                                };
                                return selectQ;
                            } else {
                                const singleLineText: TextQuestion = {
                                    id: curDataElement[0].id,
                                    code: curDataElement[0].code,
                                    text: curDataElement[0].formName,
                                    type: "text",
                                    value: "",
                                    multiline: false,
                                };

                                return singleLineText;
                            }
                        }

                        case "LONG_TEXT": {
                            const singleLineTextQ: TextQuestion = {
                                id: curDataElement[0].id,
                                code: curDataElement[0].code,
                                text: curDataElement[0].formName,
                                type: "text",
                                value: "",
                                multiline: true,
                            };

                            return singleLineTextQ;
                        }

                        case "DATE": {
                            const dateQ: DateQuestion = {
                                id: curDataElement[0].id,
                                code: curDataElement[0].code,
                                text: curDataElement[0].formName,
                                type: "date",
                                value: new Date(),
                            };

                            return dateQ;
                        }
                    }
                }
            })
        );

        return questions;
    }

    getSignalEvent(eventId: string): FutureData<Event> {
        return apiToFuture(
            this.api.request<Event>({
                method: "get",
                url: `/tracker/events/${eventId}?fields=dataValues`,
            })
        ).flatMap(resp => {
            console.debug(resp);
            return Future.success(resp);
        });
    }
}
