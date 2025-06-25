import {
    AMCQuestionId,
    AMCQuestionnaireQuestions,
} from "../../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { OptionType } from "../../../../../domain/entities/amc-questionnaires/Option";
import { AMCQuestionnaireOptionsContextState } from "../../../../contexts/amc-questionnaire-options-context";
import { FormFieldState, getStringFieldValue } from "../../../form/presentation-entities/FormFieldsState";
import { FormOption } from "../../../form/presentation-entities/FormOption";

export function mapToFormOptions<
    T extends AMCQuestionnaireOptionsContextState[keyof AMCQuestionnaireOptionsContextState]
>(options: T, disabledOptions: string[] = []): FormOption[] {
    return options.map(
        (option): FormOption => ({
            value: option.code,
            label: option.name,
            disabled: disabledOptions.includes(option.code),
        })
    );
}

export function getQuestionById(id: AMCQuestionId, questions: AMCQuestionnaireQuestions): string {
    return questions.find(question => question.id === id)?.text || "";
}

export function getOptionCodeFromFieldValue<T extends string>(
    formFieldId: string,
    options: OptionType<T>[],
    formFields: FormFieldState[]
): T | undefined {
    return options.find(option => option.code === getStringFieldValue(formFieldId, formFields))?.code;
}
