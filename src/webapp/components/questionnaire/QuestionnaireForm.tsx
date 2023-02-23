import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { Button, LinearProgress, makeStyles } from "@material-ui/core";
import React, { useEffect, useState } from "react";
import { Id } from "../../../domain/entities/Base";
import {
    Questionnaire,
    QuestionnaireSelector,
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

export interface QuestionnarieFormProps {
    id: Id;
    orgUnitId: Id;
    year: number;
    onBackClick(): void;
    disabled: boolean;
    onSave(questionnaire: QuestionnaireSimple): void;
}

const QuestionnaireFormComp: React.FC<QuestionnarieFormProps> = props => {
    const { onBackClick, disabled } = props;
    const [questionnaire, setAsCompleted] = useQuestionnaire(props);
    const classes = useStyles();

    if (!questionnaire) return <LinearProgress />;

    return (
        <Wrapper>
            <PageHeader title={i18n.t("Back to list")} onBackClick={onBackClick} />

            <Header>
                {questionnaire.isCompleted ? (
                    <span className="comp completed">{i18n.t("Completed")}</span>
                ) : (
                    <span className="comp">{i18n.t("Not completed")}</span>
                )}

                {disabled ? null : (
                    <div>
                        {questionnaire.isCompleted ? (
                            <Button onClick={() => setAsCompleted(false)} variant="contained" color="secondary">
                                {i18n.t("Set as incomplete")}
                            </Button>
                        ) : (
                            <Button onClick={() => setAsCompleted(true)} variant="contained" color="primary">
                                {i18n.t("Set as completed")}
                            </Button>
                        )}
                    </div>
                )}

                <div className="head">
                    <h3>{questionnaire.name}</h3>
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
                                        <DataTableCell>
                                            <span>{question.text}</span>
                                        </DataTableCell>

                                        <DataTableCell key={question.id}>
                                            <Question
                                                questionnaire={questionnaire}
                                                question={question}
                                                disabled={disabled}
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
    const snackbar = useSnackbar();
    const [questionnaire, setQuestionnaire] = useState<Questionnaire>();
    const { onSave, id, orgUnitId, year } = options;
    const module = useGlassModule(compositionRoot);

    useEffect(() => {
        if (module.kind !== "loaded") return;
        return compositionRoot.questionnaires
            .get(module.data, options)
            .run(setQuestionnaire, err => snackbar.error(err));
    }, [compositionRoot, options, snackbar, module]);

    const selector = React.useMemo<QuestionnaireSelector>(() => ({ id, orgUnitId, year }), [id, orgUnitId, year]);

    const setAsCompleted = useCallbackEffect(
        React.useCallback(
            (isCompleted: boolean) => {
                return compositionRoot.questionnaires.setAsCompleted(selector, isCompleted).run(
                    () => {
                        setQuestionnaire(prevQuestionnarire => {
                            if (!prevQuestionnarire) return;
                            const questionnaireUpdated = QuestionnarieM.setAsComplete(prevQuestionnarire, isCompleted);
                            onSave(questionnaireUpdated);
                            return questionnaireUpdated;
                        });
                    },
                    err => snackbar.error(err)
                );
            },
            [compositionRoot, snackbar, selector, onSave]
        )
    );

    return [questionnaire, setAsCompleted] as const;
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
        height: 0;
        text-transform: uppercase;
        font-size: 12px;
        color: ${glassColors.orange};
        &.completed {
            color: ${glassColors.green};
        }
    }
`;

export default React.memo(QuestionnaireFormComp);
