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

export type ValidationErrorMessage = "This value cannot be higher than the value provided in question 5.";

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

export type QuestionnaireRule = RuleToggleSectionsVisibility | RuleSectionValuesHigherThan;

interface RuleToggleSectionsVisibility {
    type: "setSectionsVisibility";
    dataElementCode: Code;
    sectionCodes: Code[];
}

interface RuleSectionValuesHigherThan {
    type: "sectionValuesHigherThan";
    dataElementCodesLowerToHigher: Dictionary<Code>;
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
                                ? { ...section, isVisible: areRuleSectionsVisible }
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
                        validationError: "This value cannot be higher than the value provided in question 5.",
                    };
                }
            }
            return {
                ...question,
                validationError: undefined,
            };
        });
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
