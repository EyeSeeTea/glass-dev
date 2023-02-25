import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { makeStyles } from "@material-ui/core";
import React from "react";
import {
    Questionnaire,
    QuestionnaireQuestion,
    QuestionnaireQuestionM,
    QuestionnaireSelector,
} from "../../../domain/entities/Questionnaire";
import { assertUnreachable } from "../../../types/utils";
import { useAppContext } from "../../contexts/app-context";
import BooleanWidget from "./BooleanWidget";
import NumberWidget from "./NumberWidget";
import SingleSelect from "./SingleSelectWidget";
import TextWidget from "./TextWidget";
import YesNoWidget from "./YesNoWidget";

export interface DataElementItemProps {
    questionnaire: Questionnaire;
    question: QuestionnaireQuestion;
    disabled: boolean;
    setQuestion(newQuestion: QuestionnaireQuestion): void;
}

const Question: React.FC<DataElementItemProps> = React.memo(props => {
    const classes = useStyles();

    return (
        <div className={classes.valueWrapper}>
            <div className={classes.valueInput}>
                <QuestionInput {...props} />
            </div>
        </div>
    );
});

export type QuestionInputProps = DataElementItemProps;

export const QuestionInput: React.FC<QuestionInputProps> = React.memo(props => {
    const { question, disabled } = props;
    const setQuestionToSave = useSaveActions(props);
    const { type } = question;
    const { update } = QuestionnaireQuestionM;

    switch (type) {
        case "select":
            return (
                <SingleSelect
                    value={question.value?.id}
                    options={question.options}
                    onValueChange={value => setQuestionToSave(update(question, value))}
                    disabled={disabled}
                />
            );
        case "boolean": {
            const BooleanComponent = question.storeFalse ? YesNoWidget : BooleanWidget;
            return (
                <BooleanComponent
                    value={question.value}
                    onValueChange={value => setQuestionToSave(update(question, value))}
                    disabled={disabled}
                />
            );
        }
        case "number":
            return (
                <NumberWidget
                    value={question.value}
                    onValueChange={value => setQuestionToSave(update(question, value))}
                    disabled={disabled}
                    numberType={question.numberType}
                />
            );
        case "text":
            return (
                <TextWidget
                    value={question.value}
                    onValueChange={value => setQuestionToSave(update(question, value))}
                    disabled={disabled}
                    multiline={question.multiline}
                />
            );
        default:
            assertUnreachable(type);
    }
});

function useSaveActions(options: DataElementItemProps) {
    const { setQuestion } = options;

    const snackbar = useSnackbar();
    const { compositionRoot } = useAppContext();
    const { id, orgUnit, year } = options.questionnaire;

    const selector = React.useMemo<QuestionnaireSelector>(
        () => ({ id, orgUnitId: orgUnit.id, year }),
        [id, orgUnit.id, year]
    );

    const [questionToSave, setQuestionToSave] = React.useState<QuestionnaireQuestion>();

    React.useEffect(() => {
        if (!questionToSave) return;
        return compositionRoot.questionnaires.saveResponse(selector, questionToSave).run(
            () => setQuestion(questionToSave),
            err => snackbar.error(err)
        );
    }, [compositionRoot, snackbar, selector, setQuestion, questionToSave]);

    return setQuestionToSave;
}

const useStyles = makeStyles({
    valueInput: { flexGrow: 1 },
    valueWrapper: { display: "flex" },
});

export default React.memo(Question);
