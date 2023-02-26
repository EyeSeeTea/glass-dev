import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { makeStyles } from "@material-ui/core";
import React from "react";
// @ts-ignore
import { DataTableRow, DataTableCell } from "@dhis2/ui";
import { Question, QuestionnaireSelector } from "../../../domain/entities/Questionnaire";
import { useAppContext } from "../../contexts/app-context";
import styled from "styled-components";
import { QuestionWidget } from "./QuestionInput";

export interface DataElementItemProps {
    selector: QuestionnaireSelector;
    question: Question;
    disabled: boolean;
    setQuestion(newQuestion: Question): void;
}

const QuestionRow: React.FC<DataElementItemProps> = React.memo(props => {
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
                        <QuestionWidget {...props} onChange={setQuestionToSave} />
                    </div>
                </div>
            </DataTableCell>
        </DataTableRowWithSavingFeedback>
    );
});

function useSaveActions(options: DataElementItemProps) {
    const { selector, setQuestion } = options;

    const snackbar = useSnackbar();
    const { compositionRoot } = useAppContext();

    const [saveState, setSaveState] = React.useState<SaveState>("original");
    const [questionToSave, setQuestionToSave] = React.useState<Question>();

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

export default React.memo(QuestionRow);
