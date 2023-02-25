import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { makeStyles } from "@material-ui/core";
import React from "react";
import { NamedRef } from "../../../domain/entities/Base";
import {
    Questionnaire,
    QuestionnaireQuestion,
    QuestionnaireQuestionM,
    QuestionnaireSelector,
} from "../../../domain/entities/Questionnaire";
import { assertUnreachable, Maybe } from "../../../types/utils";
import { useAppContext } from "../../contexts/app-context";
import BooleanWidget from "./BooleanWidget";
import NumberWidget from "./NumberWidget";
import SingleSelect from "./SingleSelectWidget";
import TextWidget from "./TextWidget";

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
    const actions = useSaveActions(props);
    const { type } = question;

    switch (type) {
        case "select":
            return (
                <SingleSelect
                    value={question.value?.id}
                    options={question.options}
                    onValueChange={actions.saveOption}
                    disabled={disabled}
                />
            );
        case "boolean":
            return <BooleanWidget value={question.value} onValueChange={actions.saveBoolean} disabled={disabled} />;
        case "number":
            return (
                <NumberWidget
                    value={question.value}
                    onValueChange={actions.saveNumber}
                    disabled={disabled}
                    numberType={question.numberType}
                />
            );
        case "text":
            return (
                <TextWidget
                    value={question.value}
                    onValueChange={actions.saveString}
                    disabled={disabled}
                    multiline={question.multiline}
                />
            );
        default:
            assertUnreachable(type);
    }
});

function useSaveActions(options: DataElementItemProps) {
    const { setQuestion, question } = options;

    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const { id, orgUnit, year } = options.questionnaire;

    const selector = React.useMemo<QuestionnaireSelector>(
        () => ({ id, orgUnitId: orgUnit.id, year }),
        [id, orgUnit.id, year]
    );

    const [questionToSave, setQuestionToSave] = React.useState<QuestionnaireQuestion>();

    const saveOption = React.useCallback(
        (value: Maybe<NamedRef>) => {
            return question.type === "select"
                ? setQuestionToSave(QuestionnaireQuestionM.update(question, value))
                : undefined;
        },
        [question]
    );

    const saveBoolean = React.useCallback(
        (value: Maybe<boolean>) => {
            return question.type === "boolean"
                ? setQuestionToSave(QuestionnaireQuestionM.update(question, value))
                : undefined;
        },
        [question]
    );

    const saveString = React.useCallback(
        (value: string) => {
            return question.type === "text" || question.type === "number"
                ? setQuestionToSave(QuestionnaireQuestionM.update(question, value))
                : undefined;
        },
        [question]
    );

    React.useEffect(() => {
        if (!questionToSave) return;
        return compositionRoot.questionnaires.saveResponse(selector, questionToSave).run(
            () => setQuestion(questionToSave),
            err => snackbar.error(err)
        );
    }, [compositionRoot, snackbar, selector, setQuestion, questionToSave]);

    return { saveOption, saveBoolean, saveString, saveNumber: saveString };
}

const useStyles = makeStyles({
    valueInput: { flexGrow: 1 },
    valueWrapper: { display: "flex" },
});

export default React.memo(Question);
