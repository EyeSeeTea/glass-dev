import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { makeStyles } from "@material-ui/core";
import React from "react";
import { NamedRef } from "../../../domain/entities/Base";
import {
    Questionnaire,
    QuestionnaireQuestion,
    QuestionnaireSelector,
} from "../../../domain/entities/Questionnaire";
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

export type QuestionInputProps = DataElementItemProps;

export const QuestionInput: React.FC<QuestionInputProps> = React.memo(props => {
    const { questionnaire, disabled } = props;
    const [question, actions] = useSaveActions(questionnaire, props.question);
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

function useSaveActions(questionnaire: Questionnaire, propQuestion: QuestionnaireQuestion) {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const { id, orgUnit, year } = questionnaire;
    const [question, setQuestion] = React.useState(propQuestion);

    const selector = React.useMemo<QuestionnaireSelector>(
        () => ({ id, orgUnitId: orgUnit.id, year }),
        [id, orgUnit.id, year]
    );

    const save = React.useCallback(
        (question: QuestionnaireQuestion) => {
            return compositionRoot.questionnaires.saveResponse(selector, question).run(
                () => setQuestion(question),
                err => snackbar.error(err)
            );
        },
        [compositionRoot, snackbar, selector]
    );

    const saveOption = useCallbackEffect(
        React.useCallback(
            (option: Maybe<NamedRef>) => {
                return propQuestion.type === "select" ? save({ ...propQuestion, value: option }) : undefined;
            },
            [propQuestion, save]
        )
    );

    const saveBoolean = useCallbackEffect(
        React.useCallback(
            (value: Maybe<boolean>) => {
                return propQuestion.type === "boolean" ? save({ ...propQuestion, value: value }) : undefined;
            },
            [propQuestion, save]
        )
    );

    const saveString = useCallbackEffect(
        React.useCallback(
            (value: string) => {
                return propQuestion.type === "text" || propQuestion.type === "number"
                    ? save({ ...propQuestion, value: value })
                    : undefined;
            },
            [propQuestion, save]
        )
    );

    const actions = { saveOption, saveBoolean, saveString, saveNumber: saveString };
    return [question, actions] as const;
}

const useStyles = makeStyles({
    valueInput: { flexGrow: 1 },
    valueWrapper: { display: "flex" },
});

export default React.memo(Question);
