import { makeStyles } from "@material-ui/core";
import React from "react";
// @ts-ignore
import { DataTableRow, DataTableCell } from "@dhis2/ui";
import { Question, QuestionnaireSelector } from "../../../domain/entities/Questionnaire";
import styled from "styled-components";
import { QuestionWidget } from "./QuestionInput";

export interface DataElementItemProps {
    selector?: QuestionnaireSelector;
    question: Question;
    disabled: boolean;
    handleQuestionChange(newQuestion: Question): void;
}

const QuestionRow: React.FC<DataElementItemProps> = React.memo(props => {
    const { question, handleQuestionChange: updateQuestionnaireState } = props;
    const classes = useStyles();

    return (
        <StyledDataTableRow>
            <DataTableCell width="60%">
                <span>{question.text}</span>
            </DataTableCell>

            <DataTableCell>
                <div className={classes.valueWrapper}>
                    <div className={classes.valueInput}>
                        <QuestionWidget {...props} onChange={updateQuestionnaireState} />
                    </div>
                </div>
            </DataTableCell>
        </StyledDataTableRow>
    );
});

const StyledDataTableRow = styled(DataTableRow)`
    transition: background-color 0.5s;
    td {
        background-color: inherit !important;
        vertical-align: middle;
    }
`;

const useStyles = makeStyles({
    valueInput: { flexGrow: 1 },
    valueWrapper: { display: "flex" },
});

export default React.memo(QuestionRow);
