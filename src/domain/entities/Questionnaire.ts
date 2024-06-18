import { assertUnreachable, Dictionary, Maybe } from "../../types/utils";
import { Code, Id, NamedRef, Ref, updateCollection } from "./Base";

export const AMCDataQuestionnaire = "qGG6BjULAaf";
export type QuestionnairesType = "Program" | "Dataset";
export interface QuestionnaireBase {
    id: Id;
    name: string;
    description: string;
    orgUnit: Ref;
    year: string;
    isCompleted: boolean;
    isMandatory: boolean;
    rules: QuestionnaireRule[];
    subQuestionnaires?: NamedRef[];
    aggSubQuestionnaires?: NamedRef[];
    eventId?: Id;
    parentEventId?: Id;
}

export interface QuestionnaireSelector {
    id: Id;
    orgUnitId: Id;
    year: string;
}

export interface Questionnaire extends QuestionnaireBase {
    sections: QuestionnaireSection[];
}

export interface QuestionnaireSection {
    title: string;
    code: Code;
    questions: Question[];
    isVisible: boolean;
}

export type Question =
    | SelectQuestion
    | NumberQuestion
    | TextQuestion
    | BooleanQuestion
    | DateQuestion
    | SingleCheckQuestion;

export type ValidationErrorMessage = string;

export interface QuestionBase {
    id: Id;
    code: Code;
    text: string;
    disabled?: boolean;
    infoText?: string;
    validationError?: ValidationErrorMessage;
}

export interface SelectQuestion extends QuestionBase {
    type: "select";
    options: QuestionOption[];
    value: Maybe<QuestionOption>;
}

export interface NumberQuestion extends QuestionBase {
    type: "number";
    numberType:
        | "NUMBER"
        | "INTEGER_ZERO_OR_POSITIVE"
        | "INTEGER"
        | "INTEGER_NEGATIVE"
        | "INTEGER_POSITIVE"
        | "INTEGER_ZERO_OR_POSITIVE";
    value: Maybe<string>; // Use string representation to avoid problems with rounding
}

export interface TextQuestion extends QuestionBase {
    type: "text";
    value: Maybe<string>;
    multiline: boolean;
}

export interface BooleanQuestion extends QuestionBase {
    type: "boolean";
    storeFalse: boolean;
    value: Maybe<boolean>;
}

export interface DateQuestion extends QuestionBase {
    type: "date";
    value: Maybe<Date>;
}

export interface SingleCheckQuestion extends QuestionBase {
    type: "singleCheck";
    storeFalse: boolean;
    value: Maybe<boolean>;
}

export interface QuestionOption extends NamedRef {
    code?: string;
}

export type QuestionnaireRule =
    | RuleToggleSectionsVisibility
    | RuleSectionValuesHigherThan
    | RuleQuestionValueLessThanConst
    | RuleQuestionValueDoubleOfAnother;

interface RuleToggleSectionsVisibility {
    type: "setSectionsVisibility";
    dataElementCode: Code;
    sectionCodes: Code[];
}

interface RuleSectionValuesHigherThan {
    type: "sectionValuesHigherThan";
    dataElementCodesLowerToHigher: Dictionary<Code>;
    errorMessage: string;
}

interface RuleQuestionValueLessThanConst {
    type: "questionValueLessThanConst";
    dataElementCode: Code;
    constValue: number;
    errorMessage: string;
}

interface RuleQuestionValueDoubleOfAnother {
    type: "questionValueDoubleOfAnother";
    dataElementCode: Code;
    doubleDataElementCode: Code;
    errorMessage: string;
}
export class QuestionnarieM {
    static setAsComplete(questionnarie: Questionnaire, value: boolean): Questionnaire {
        return { ...questionnarie, isCompleted: value };
    }

    static updateQuestion(questionnaire: Questionnaire, questionUpdated: Question): Questionnaire {
        return this.applyRules({
            ...questionnaire,
            sections: questionnaire.sections.map(section => ({
                ...section,
                questions: updateCollection(section.questions, questionUpdated),
            })),
        });
    }

    static applyRules(questionnaire: Questionnaire) {
        const questionsByCode = _(questionnaire.sections)
            .flatMap(section => section.questions)
            .keyBy(question => question.code)
            .value();

        return _(questionnaire.rules).reduce((questionnaireAcc, rule) => {
            const ruleType = rule.type;
            switch (ruleType) {
                case "setSectionsVisibility": {
                    const toggleQuestion = questionsByCode[rule.dataElementCode];
                    const areRuleSectionsVisible = Boolean(toggleQuestion?.value);

                    return {
                        ...questionnaireAcc,
                        sections: questionnaireAcc.sections.map((section): QuestionnaireSection => {
                            return rule.sectionCodes.includes(section.code)
                                ? {
                                      ...section,
                                      isVisible: areRuleSectionsVisible,
                                      questions: areRuleSectionsVisible
                                          ? section.questions
                                          : section.questions.map(question => {
                                                return {
                                                    ...question,
                                                    value: undefined,
                                                };
                                            }),
                                  }
                                : section;
                        }),
                    };
                }
                case "sectionValuesHigherThan": {
                    return {
                        ...questionnaireAcc,
                        sections: questionnaireAcc.sections.map((section): QuestionnaireSection => {
                            return {
                                ...section,
                                questions: this.applyRuleSectionValuesHigherThan(
                                    questionsByCode,
                                    rule,
                                    section.questions
                                ),
                            };
                        }),
                    };
                }
                case "questionValueLessThanConst": {
                    return {
                        ...questionnaireAcc,
                        sections: questionnaireAcc.sections.map((section): QuestionnaireSection => {
                            return {
                                ...section,
                                questions: this.applyRuleQuestionValueLessThan(rule, section.questions),
                            };
                        }),
                    };
                }
                case "questionValueDoubleOfAnother": {
                    return {
                        ...questionnaireAcc,
                        sections: questionnaireAcc.sections.map((section): QuestionnaireSection => {
                            return {
                                ...section,
                                questions: this.applyRuleQuestionValueDoubleOfAnother(rule, section.questions),
                            };
                        }),
                    };
                }
                default:
                    assertUnreachable(ruleType);
            }
        }, questionnaire);
    }

    private static applyRuleSectionValuesHigherThan(
        questionsByCode: Dictionary<Question>,
        rule: RuleSectionValuesHigherThan,
        questions: Question[]
    ): Question[] {
        return questions.map((question): Question => {
            const questionWithHigherValueCode = rule.dataElementCodesLowerToHigher[question.code];

            if (questionWithHigherValueCode) {
                const questionWithHigherValue = questionsByCode[questionWithHigherValueCode];
                if (parseFloat(questionWithHigherValue?.value as string) < parseFloat(question?.value as string)) {
                    return {
                        ...question,
                        validationError: this.addValidationError(question, rule.errorMessage),
                    };
                } else {
                    return {
                        ...question,
                        validationError: this.removeValidationError(question, rule.errorMessage),
                    };
                }
            }
            return {
                ...question,
                validationError: question.validationError ?? undefined,
            };
        });
    }
    private static applyRuleQuestionValueLessThan(
        rule: RuleQuestionValueLessThanConst,
        questions: Question[]
    ): Question[] {
        return questions.map(question => {
            if (question.code === rule.dataElementCode) {
                if (parseFloat(question.value as string) < rule.constValue) {
                    return {
                        ...question,
                        validationError: this.addValidationError(question, rule.errorMessage),
                    };
                } else {
                    return {
                        ...question,
                        validationError: this.removeValidationError(question, rule.errorMessage),
                    };
                }
            } else return question;
        });
    }

    private static applyRuleQuestionValueDoubleOfAnother(
        rule: RuleQuestionValueDoubleOfAnother,
        questions: Question[]
    ): Question[] {
        return questions.map(question => {
            if (question.code === rule.dataElementCode) {
                const anotherQuestion = questions.find(q => q.code === rule.doubleDataElementCode);

                if (2 * parseFloat(question.value as string) > parseFloat(anotherQuestion?.value as string)) {
                    return {
                        ...question,
                        validationError: this.addValidationError(question, rule.errorMessage),
                    };
                } else {
                    return {
                        ...question,
                        validationError: this.removeValidationError(question, rule.errorMessage),
                    };
                }
            } else return question;
        });
    }

    private static addValidationError(question: Question, errorMessage: string): string {
        return question.validationError
            ? !question.validationError.includes(errorMessage)
                ? question.validationError.concat(`; ${errorMessage}`)
                : question.validationError
            : errorMessage;
    }

    private static removeValidationError(question: Question, errorMessage: string): string | undefined {
        return question.validationError?.replace(`${errorMessage}`, "").trim().replace(/;$/, "") ?? undefined;
    }
}

export class QuestionnaireQuestionM {
    static isValidNumberValue(s: string, numberType: NumberQuestion["numberType"]): boolean {
        if (!s) return true;

        switch (numberType) {
            case "INTEGER":
                return isInteger(s);
            case "NUMBER":
                return true;
            case "INTEGER_ZERO_OR_POSITIVE":
                return isInteger(s) && parseInt(s) >= 0;
            case "INTEGER_NEGATIVE":
                return isInteger(s) && parseInt(s) < 0;
            case "INTEGER_POSITIVE":
                return isInteger(s) && parseInt(s) > 0;
            default:
                assertUnreachable(numberType);
        }
    }

    static update<Q extends Question>(question: Q, value: Q["value"]): Q {
        return { ...question, value };
    }
}

function isInteger(s: string): boolean {
    return Boolean(s.match(/^-?\d*$/));
}
