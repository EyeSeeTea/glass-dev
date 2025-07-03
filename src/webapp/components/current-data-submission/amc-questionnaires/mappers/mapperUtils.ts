import {
    AMCQuestionId,
    AMCQuestionnaireQuestions,
} from "../../../../../domain/entities/amc-questionnaires/AMCQuestionnaireQuestions";
import { AMCQuestionnaireOptionsContextState } from "../../../../contexts/amc-questionnaire-options-context";
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

export function getQuestionTextsByQuestionId(
    id: AMCQuestionId,
    questions: AMCQuestionnaireQuestions
): { text: string; infoTooltipText?: string } {
    const question = questions.find(question => question.id === id);
    if (!question) {
        console.warn(`Question with id ${id} not found.`);
        return { text: "", infoTooltipText: undefined };
    }
    return {
        text: question.text,
        infoTooltipText: question.description,
    };
}
