import { LinearProgress, makeStyles } from "@material-ui/core";
import React, { useCallback, useMemo } from "react";
import { Id } from "../../../domain/entities/Base";
import { Question, QuestionnaireBase } from "../../../domain/entities/Questionnaire";
// @ts-ignore
import { DataTable, TableHead, DataTableRow, DataTableColumnHeader, TableBody } from "@dhis2/ui";
import QuestionRow from "./QuestionRow";
import { PageHeader } from "../page-header/PageHeader";
import styled from "styled-components";
import { QuestionnaireActions } from "./QuestionnaireActions";
import { useSaveQuestionnaire } from "./hooks/useSaveQuestionnaire";
import { useQuestionnaire } from "./hooks/useQuestionnaire";

export interface QuestionnarieFormProps {
    id: Id;
    orgUnitId: Id;
    year: string;
    mode: "show" | "edit";
    onBackClick(): void;
    onSave(questionnaire: QuestionnaireBase): void;
    validateAndUpdateDataSubmissionStatus(complete: boolean, questionnaireId: string): void;
}

const QuestionnaireForm: React.FC<QuestionnarieFormProps> = props => {
    const { onBackClick, mode } = props;

    const [questionnaire, selector, actions, isSaving] = useQuestionnaire(props);
    const { isSavingQuestionnaire, questionsToSave, setQuestionsToSave, saveQuestionnaire } =
        useSaveQuestionnaire(selector);

    const classes = useStyles();
    const disabled = questionnaire?.isCompleted ? true : mode === "show";

    const handleQuestionChange = useCallback(
        (newQuestion: Question) => {
            actions.setQuestion(newQuestion);

            setQuestionsToSave(prevState => {
                const existingQuestion = prevState.find(question => question.id === newQuestion.id);
                if (!existingQuestion) {
                    return [...prevState, newQuestion];
                } else {
                    return prevState.map(question => (question.id === newQuestion.id ? newQuestion : question));
                }
            });
        },
        [actions, setQuestionsToSave]
    );

    const validationErrors = useMemo(() => {
        return questionnaire?.sections.flatMap(section =>
            _(section.questions)
                .map(question => (question.validationError ? question.validationError : undefined))
                .compact()
                .value()
        );
    }, [questionnaire]);

    const disableSave = _.isEmpty(questionsToSave) || !_.isEmpty(validationErrors) || isSavingQuestionnaire;

    const setAsCompleted = (complete: boolean) => {
        if (complete && !disableSave) {
            saveQuestionnaire(true);
        }

        actions.setAsCompleted(complete, {
            onSuccess: () => {
                props.validateAndUpdateDataSubmissionStatus(complete, selector.id);
            },
        });
    };

    if (!questionnaire) return <LinearProgress />;

    return (
        <FormWrapper>
            <PageHeader title={questionnaire.name} onBackClick={onBackClick} />
            <QuestionnaireActions
                description={questionnaire.description}
                isCompleted={questionnaire.isCompleted}
                isSaving={isSaving}
                mode={mode}
                setAsCompleted={complete => setAsCompleted(complete)}
                saveQuestionnaireActions={{
                    saveQuestionnaire: saveQuestionnaire,
                    disableSave: disableSave,
                    isSavingQuestionnaire: isSavingQuestionnaire,
                }}
            />
            {questionnaire.sections.map(section => {
                if (!section.isVisible) return null;

                return (
                    <div key={section.title} className={classes.wrapper}>
                        <DataTable>
                            <TableHead>
                                <DataTableRow>
                                    <DataTableColumnHeader colSpan="2">
                                        <span className={classes.header}>{section.title}</span>
                                    </DataTableColumnHeader>
                                </DataTableRow>
                            </TableHead>

                            <TableBody>
                                {section.questions.map(question => (
                                    <QuestionRow
                                        key={question.id}
                                        selector={selector}
                                        disabled={disabled}
                                        question={question}
                                        handleQuestionChange={handleQuestionChange}
                                    />
                                ))}
                            </TableBody>
                        </DataTable>
                    </div>
                );
            })}
            <div className="desc-display">
                <span className="desc">{questionnaire.description}</span>
            </div>
        </FormWrapper>
    );
};

const FormWrapper = styled.div`
    gap: 0px;

    .desc {
        margin-left: 14px;
        white-space: pre-wrap;
    }

    .desc-display * {
        display: block;
    }
`;

export const useStyles = makeStyles({
    wrapper: { margin: 10 },
    header: { fontWeight: "bold" as const },
    center: { display: "table", margin: "0 auto" },
});

export default React.memo(QuestionnaireForm);
