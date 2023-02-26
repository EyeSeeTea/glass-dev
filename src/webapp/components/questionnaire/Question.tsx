import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { makeStyles } from "@material-ui/core";
import React from "react";
// @ts-ignore
import { DataTableRow, DataTableCell } from "@dhis2/ui";
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
import styled from "styled-components";

export interface DataElementItemProps {
    questionnaire: Questionnaire;
    question: QuestionnaireQuestion;
    disabled: boolean;
    setQuestion(newQuestion: QuestionnaireQuestion): void;
}

const Question: React.FC<DataElementItemProps> = React.memo(props => {
    const { question } = props;
    const classes = useStyles();
    const [saveState, setQuestionToSave] = useSaveActions(props);

    return (
        <DataTableRowWithSavingFeedback saveState={saveState}>
            <DataTableCell width="60%">
                <span>{question.text}</span>
            </DataTableCell>

            <DataTableCell>
                <div className={classes.valueWrapper}>
                    <div className={classes.valueInput}>
                        <QuestionInput {...props} setQuestionToSave={setQuestionToSave} />
                    </div>
                </div>
            </DataTableCell>
        </DataTableRowWithSavingFeedback>
    );
});

export interface QuestionInputProps extends DataElementItemProps {
    setQuestionToSave: React.Dispatch<React.SetStateAction<QuestionnaireQuestion | undefined>>;
}

export const QuestionInput: React.FC<QuestionInputProps> = React.memo(props => {
    const { question, disabled, setQuestionToSave } = props;
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

    const [saveState, setSaveState] = React.useState<SaveState>("original");

    const [questionToSave, setQuestionToSave] = React.useState<QuestionnaireQuestion>();

    React.useEffect(() => {
        if (!questionToSave) return;

        setSaveState("saving");
        return compositionRoot.questionnaires.saveResponse(selector, questionToSave).run(
            () => {
                setSaveState("saveSuccessful");
                setQuestion(questionToSave);
            },
            err => {
                setSaveState("saveError");
                snackbar.error(err);
            }
        );
    }, [compositionRoot, snackbar, selector, setQuestion, questionToSave]);

    return [saveState, setQuestionToSave] as const;
}

interface SavingFeedbackProps {
    saveState: SaveState;
}

const DataTableRowWithSavingFeedback = styled(DataTableRow)`
    transition: background-color 0.5s;
    background-color: ${(props: SavingFeedbackProps) => colorByState[props.saveState]};

    td {
        background-color: inherit !important;
        vertical-align: middle;
    }
`;

const useStyles = makeStyles({
    valueInput: { flexGrow: 1 },
    valueWrapper: { display: "flex" },
});

type SaveState = "original" | "saving" | "saveSuccessful" | "saveError";

const colorByState: Record<SaveState, string> = {
    original: "rgb(255, 255, 255)",
    saving: "rgb(255, 255, 225)",
    saveSuccessful: "rgb(255, 255, 255)",
    saveError: "rgb(255, 225, 225)",
};

export default React.memo(Question);
