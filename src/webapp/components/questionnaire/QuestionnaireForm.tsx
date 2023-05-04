import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { LinearProgress, makeStyles } from "@material-ui/core";
import React, { useEffect, useState } from "react";
import { Id } from "../../../domain/entities/Base";
import { Questionnaire, Question, QuestionnaireBase, QuestionnarieM } from "../../../domain/entities/Questionnaire";
import { useAppContext } from "../../contexts/app-context";
// @ts-ignore
import { DataTable, TableHead, DataTableRow, DataTableColumnHeader, TableBody } from "@dhis2/ui";
import QuestionRow from "./QuestionRow";
import { useCallbackEffect } from "../../hooks/useCallbackEffect";
import { PageHeader } from "../page-header/PageHeader";
import styled from "styled-components";
import { useGlassModule } from "../../hooks/useGlassModule";
import { useBooleanState } from "../../hooks/useBooleanState";
import { QuestionnaireActions } from "./QuestionnaireActions";
import { useGlassCaptureAccess } from "../../hooks/useGlassCaptureAccess";

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
    const classes = useStyles();
    const disabled = questionnaire?.isCompleted ? true : mode === "show";

    const setAsCompleted = (complete: boolean) => {
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
                                        setQuestion={actions.setQuestion}
                                    />
                                ))}
                            </TableBody>
                        </DataTable>
                    </div>
                );
            })}
        </FormWrapper>
    );
};

const FormWrapper = styled.div`
    gap: 0px;
`;

function useQuestionnaire(options: QuestionnarieFormProps) {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const module = useGlassModule(compositionRoot);
    const [isSaving, savingActions] = useBooleanState(false);

    const { onSave, id, orgUnitId, year } = options;
    const selector = React.useMemo(() => ({ id, orgUnitId, year }), [id, orgUnitId, year]);
    const [questionnaire, setQuestionnaire] = useState<Questionnaire>();
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess() ? true : false;

    useEffect(() => {
        if (module.kind !== "loaded") return;
        return compositionRoot.questionnaires
            .get(module.data, selector, hasCurrentUserCaptureAccess)
            .run(setQuestionnaire, err => snackbar.error(err));
    }, [compositionRoot, snackbar, selector, module, hasCurrentUserCaptureAccess]);

    React.useEffect(() => {
        if (questionnaire) onSave(questionnaire);
    }, [questionnaire, onSave]);

    const setAsCompleted = useCallbackEffect(
        React.useCallback(
            (isCompleted: boolean, options: { onSuccess: () => void }) => {
                savingActions.enable();

                return compositionRoot.questionnaires.setAsCompleted(selector, isCompleted).run(
                    () => {
                        savingActions.disable();
                        options.onSuccess();
                        setQuestionnaire(questionnaire => {
                            return questionnaire ? QuestionnarieM.setAsComplete(questionnaire, isCompleted) : undefined;
                        });
                    },
                    err => {
                        savingActions.disable();
                        snackbar.error(err);
                    }
                );
            },
            [compositionRoot, snackbar, selector, savingActions]
        )
    );

    const setQuestion = React.useCallback((newQuestion: Question) => {
        setQuestionnaire(questionnaire => {
            return questionnaire ? QuestionnarieM.updateQuestion(questionnaire, newQuestion) : undefined;
        });
    }, []);

    const actions = { setAsCompleted, setQuestion };

    return [questionnaire, selector, actions, isSaving] as const;
}

const useStyles = makeStyles({
    wrapper: { margin: 10 },
    header: { fontWeight: "bold" as const },
    center: { display: "table", margin: "0 auto" },
});

export default React.memo(QuestionnaireForm);
