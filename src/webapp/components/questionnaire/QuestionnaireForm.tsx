import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { Button, CircularProgress, LinearProgress, makeStyles } from "@material-ui/core";
import React, { useEffect, useState } from "react";
import { Id } from "../../../domain/entities/Base";
import {
    Questionnaire,
    QuestionnaireQuestion,
    QuestionnaireSimple,
    QuestionnarieM,
} from "../../../domain/entities/Questionnaire";
import { useAppContext } from "../../contexts/app-context";
// @ts-ignore
import { DataTable, TableHead, DataTableRow, DataTableColumnHeader, TableBody, DataTableCell } from "@dhis2/ui";
import Question from "./Question";
import { useCallbackEffect } from "../../hooks/useCallbackEffect";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { PageHeader } from "../page-header/PageHeader";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { useGlassModule } from "../../hooks/useGlassModule";
import { useBooleanState } from "../../hooks/useBooleanState";

export interface QuestionnarieFormProps {
    id: Id;
    orgUnitId: Id;
    year: number;
    onBackClick(): void;
    mode: "show" | "edit";
    onSave(questionnaire: QuestionnaireSimple): void;
}

const QuestionnaireFormComp: React.FC<QuestionnarieFormProps> = props => {
    const { onBackClick, mode } = props;
    const [questionnaire, actions, isSaving] = useQuestionnaire(props);
    const classes = useStyles();
    const isCompleted = questionnaire?.isCompleted;
    const disabled = isCompleted ? true : mode === "show";

    if (!questionnaire) return <LinearProgress />;

    return (
        <Wrapper>
            <PageHeader title={questionnaire.name} onBackClick={onBackClick} />

            <Header>
                {isCompleted ? (
                    <span className="comp completed">{i18n.t("Completed")}</span>
                ) : (
                    <span className="comp">{i18n.t("Not completed")}</span>
                )}

                {mode === "edit" && (
                    <div className="buttons">
                        {isSaving && <CircularProgress size={22} />}

                        {isCompleted ? (
                            <Button onClick={() => actions.setAsCompleted(false)} variant="contained" color="secondary">
                                {i18n.t("Set as incomplete")}
                            </Button>
                        ) : (
                            <Button onClick={() => actions.setAsCompleted(true)} variant="contained" color="primary">
                                {i18n.t("Set as completed")}
                            </Button>
                        )}
                    </div>
                )}

                <div className="head">
                    <span className="desc">{questionnaire.description}</span>
                </div>
            </Header>

            {questionnaire.sections.map(section => {
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
                                    <DataTableRow key={question.id}>
                                        <DataTableCell width="60%">
                                            <span>{question.text}</span>
                                        </DataTableCell>

                                        <DataTableCell key={question.id}>
                                            <Question
                                                questionnaire={questionnaire}
                                                disabled={disabled}
                                                question={question}
                                                setQuestion={actions.setQuestion}
                                            />
                                        </DataTableCell>
                                    </DataTableRow>
                                ))}
                            </TableBody>
                        </DataTable>
                    </div>
                );
            })}
        </Wrapper>
    );
};

const Wrapper = styled.div`
    gap: 0px;
`;

function useQuestionnaire(options: QuestionnarieFormProps) {
    const { compositionRoot } = useAppContext();
    const module = useGlassModule(compositionRoot);
    const snackbar = useSnackbar();
    const [isSaving, savingActions] = useBooleanState(false);

    const { onSave, id, orgUnitId, year } = options;
    const selector = React.useMemo(() => ({ id, orgUnitId, year }), [id, orgUnitId, year]);
    const [questionnaire, setQuestionnaire] = useState<Questionnaire>();

    useEffect(() => {
        if (module.kind !== "loaded") return;
        return compositionRoot.questionnaires
            .get(module.data, selector)
            .run(setQuestionnaire, err => snackbar.error(err));
    }, [compositionRoot, snackbar, selector, module]);

    React.useEffect(() => {
        if (questionnaire) onSave(questionnaire);
    }, [questionnaire, onSave]);

    const setAsCompleted = useCallbackEffect(
        React.useCallback(
            (isCompleted: boolean) => {
                savingActions.enable();

                return compositionRoot.questionnaires.setAsCompleted(selector, isCompleted).run(
                    () => {
                        savingActions.disable();
                        setQuestionnaire(questionnaire => {
                            return questionnaire ? QuestionnarieM.setAsComplete(questionnaire, isCompleted) : undefined;
                        });
                    },
                    err => {
                        savingActions.disable();
                        return snackbar.error(err);
                    }
                );
            },
            [compositionRoot, snackbar, selector, savingActions]
        )
    );

    const setQuestion = React.useCallback((newQuestion: QuestionnaireQuestion) => {
        setQuestionnaire(questionnaire => {
            return questionnaire ? QuestionnarieM.updateQuestion(questionnaire, newQuestion) : undefined;
        });
    }, []);

    const actions = { setAsCompleted, setQuestion };

    return [questionnaire, actions, isSaving] as const;
}

const useStyles = makeStyles({
    wrapper: { margin: 10 },
    header: { fontWeight: "bold" as const },
    center: { display: "table", margin: "0 auto" },
});

const Header = styled.div`
    .head {
        * {
            display: block;
        }
    }
    .comp {
        width: 100%;
        text-align: right;
        float: right;
        text-transform: uppercase;
        margin-bottom: 5px;
        font-size: 12px;
        color: ${glassColors.orange};
        &.completed {
            color: ${glassColors.green};
        }
    }

    .buttons {
        text-align: right;
        margin-bottom: 15px;
    }
`;

export default React.memo(QuestionnaireFormComp);
