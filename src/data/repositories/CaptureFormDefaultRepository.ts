import { D2Api } from "../../types/d2-api";
import { CaptureFormRepository } from "../../domain/repositories/CaptureFormRepository";
import { FutureData, Future } from "../../domain/entities/Future";
import {
    BooleanQuestion,
    Question,
    Questionnaire,
    SelectQuestion,
    TextQuestion,
} from "../../domain/entities/Questionnaire";
import { apiToFuture } from "../../utils/futures";

const EAR_PROGRAM_ID = "SQe26z0smFP";

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

export interface OptionSets {
    id: string;
    name: string;
    options: { id: string };
}
export interface ProgramMetadata {
    programs: EARProgram[];
    programStageSections: ProgramStageSections[];
    dataElements: EARDataElements[];
    optionSets: OptionSets;
}
export class CaptureFormDefaultRepository implements CaptureFormRepository {
    constructor(private api: D2Api) {}

    get(): FutureData<Question[]> {
        const questions: Question[] = [];
        return Future.success(questions);
    }

    private mapProgramDataElementToQuestions(
        section: ProgramStageSections,
        dataElements: EARDataElements[]
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
                                // const resp = this.api.metadata
                                //     .get({
                                //         optionSets: {
                                //             fields: { id: true, name: true, options: { name: true, id: true } },
                                //             filter: { id: { eq: curDataElement[0].optionSet.id } },
                                //         },
                                //     })
                                //     .getData();

                                // let options: NamedRef[] = [];
                                // if (resp.optionSets[0]) {
                                //     options = resp.optionSets[0].options;
                                // }

                                const selectQ: SelectQuestion = {
                                    id: curDataElement[0]?.id || "",
                                    code: curDataElement[0]?.code || "",
                                    text: curDataElement[0]?.formName || "",
                                    type: "select",
                                    options: [],
                                    value: { name: "", id: "" },
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
                    }
                }
            })
        );

        return questions;
    }

    getForm(): FutureData<Questionnaire> {
        return apiToFuture(
            this.api.request<ProgramMetadata>({
                method: "get",
                url: `/programs/${EAR_PROGRAM_ID}/metadata.json?fields=programs,dataElements,programStageSections`,
            })
        ).flatMap(resp => {
            console.debug(resp);

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
                        const questions: Question[] = this.mapProgramDataElementToQuestions(section, resp.dataElements);

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
}
