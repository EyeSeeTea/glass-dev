import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { makeStyles } from "@material-ui/core";
import React from "react";
import { NamedRef } from "../../../domain/entities/Base";
import { Questionnaire, QuestionnaireQuestion, QuestionnaireSelector } from "../../../domain/entities/Questionnaire";
import { assertUnreachable, Maybe } from "../../../types/utils";
import { useAppContext } from "../../contexts/app-context";
import { useCallbackEffect } from "../../hooks/useCallbackEffect";
import BooleanWidget from "./BooleanWidget";
import NumberWidget from "./NumberWidget";
import SingleSelect from "./SingleSelectWidget";
import TextWidget from "./TextWidget";

export interface DataElementItemProps {
    questionnaire: Questionnaire;
    question: QuestionnaireQuestion;
    disabled: boolean;
}

const Question: React.FC<DataElementItemProps> = React.memo(props => {
    const { question, questionnaire, disabled } = props;
    const classes = useStyles();

    return (
        <div className={classes.valueWrapper}>
            <div className={classes.valueInput}>
                <QuestionInput question={question} questionnaire={questionnaire} disabled={disabled} />
            </div>
        </div>
    );
});

export interface QuestionInputProps {
    questionnaire: Questionnaire;
    question: QuestionnaireQuestion;
    disabled: boolean;
}

export const QuestionInput: React.FC<QuestionInputProps> = React.memo(props => {
    const { questionnaire, disabled } = props;
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();

    const [question, setQuestion] = React.useState(props.question);
    const { type } = question;
    const propQuestion = props.question;
    const { id, orgUnit, year } = questionnaire;
    const selector = React.useMemo<QuestionnaireSelector>(
        () => ({ id, orgUnitId: orgUnit.id, year }),
        [id, orgUnit.id, year]
    );

    const saveOption = useCallbackEffect(
        React.useCallback(
            (option: Maybe<NamedRef>) => {
                if (propQuestion.type !== "select") return;
                const question2 = { ...propQuestion, value: option };

                return compositionRoot.questionnaires.saveResponse(selector, question2).run(
                    () => setQuestion(question2),
                    err => snackbar.error(err)
                );
            },
            [compositionRoot, snackbar, propQuestion, selector]
        )
    );

    const saveBoolean = useCallbackEffect(
        React.useCallback(
            (value: Maybe<boolean>) => {
                if (propQuestion.type !== "boolean") return;
                const question2 = { ...propQuestion, value: value };

                return compositionRoot.questionnaires.saveResponse(selector, question2).run(
                    () => setQuestion(question2),
                    err => snackbar.error(err)
                );
            },
            [compositionRoot, selector, propQuestion, snackbar]
        )
    );

    const saveString = useCallbackEffect(
        React.useCallback(
            (value: string) => {
                if (!(propQuestion.type === "text" || propQuestion.type === "number")) return;
                const question2 = { ...propQuestion, value: value };

                return compositionRoot.questionnaires.saveResponse(selector, question2).run(
                    () => setQuestion(question2),
                    err => snackbar.error(err)
                );
            },
            [compositionRoot, selector, propQuestion, snackbar]
        )
    );

    switch (type) {
        case "select":
            return (
                <SingleSelect
                    value={question.value?.id}
                    options={question.options}
                    onValueChange={saveOption}
                    disabled={disabled}
                />
            );
        case "boolean":
            return <BooleanWidget value={question.value} onValueChange={saveBoolean} disabled={disabled} />;
        case "number":
            return <NumberWidget value={question.value} onValueChange={saveString} disabled={disabled} />;
        case "text":
            return (
                <TextWidget
                    value={question.value}
                    onValueChange={saveString}
                    disabled={disabled}
                    multiline={question.multiline}
                />
            );
        default:
            assertUnreachable(type);
    }
});

const useStyles = makeStyles({
    valueInput: { flexGrow: 1 },
    valueWrapper: { display: "flex" },
});

export default React.memo(Question);
