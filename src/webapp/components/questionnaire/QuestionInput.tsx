import React from "react";
import { Question, QuestionnaireQuestionM } from "../../../domain/entities/Questionnaire";
import { assertUnreachable } from "../../../types/utils";
import BooleanWidget from "./widgets/BooleanWidget";
import NumberWidget from "./widgets/NumberWidget";
import SingleSelect from "./widgets/SingleSelectWidget";
import TextWidget from "./widgets/TextWidget";
import YesNoWidget from "./widgets/YesNoWidget";
import DatePickerWidget from "./widgets/DatePickerWidget";

export interface QuestionWidgetProps {
    onChange: (question: Question) => void;
    question: Question;
    disabled: boolean;
}

export const QuestionWidget: React.FC<QuestionWidgetProps> = React.memo(props => {
    const { question, disabled, onChange } = props;
    const { type } = question;
    const { update } = QuestionnaireQuestionM;

    switch (type) {
        case "select":
            return (
                <SingleSelect
                    value={question.value?.id}
                    options={question.options}
                    onChange={value => onChange(update(question, value))}
                    disabled={disabled}
                />
            );
        case "boolean": {
            const BooleanComponent = question.storeFalse ? YesNoWidget : BooleanWidget;
            return (
                <BooleanComponent
                    value={question.value}
                    onChange={value => onChange(update(question, value))}
                    disabled={disabled}
                />
            );
        }
        case "number":
            return (
                <NumberWidget
                    value={question.value}
                    onChange={value => onChange(update(question, value))}
                    disabled={disabled}
                    numberType={question.numberType}
                />
            );
        case "text":
            return (
                <TextWidget
                    value={question.value}
                    onChange={value => onChange(update(question, value))}
                    disabled={disabled}
                    multiline={question.multiline}
                />
            );

        case "date":
            return (
                <DatePickerWidget
                    value={question.value}
                    onChange={value => onChange(update(question, value))}
                    disabled={disabled}
                />
            );
        default:
            assertUnreachable(type);
    }
});
