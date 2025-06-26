import React, { useEffect, useState } from "react";
import { Backdrop, Button, CircularProgress, makeStyles, withStyles } from "@material-ui/core";
// @ts-ignore
import { DataTable, TableHead, DataTableRow, DataTableColumnHeader, TableBody, DataTableCell } from "@dhis2/ui";
import { useStyles } from "../questionnaire/QuestionnaireForm";
import { useAppContext } from "../../contexts/app-context";
import { Question } from "../../../domain/entities/Questionnaire";
import { PageHeader } from "../page-header/PageHeader";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { QuestionWidget } from "../questionnaire/QuestionInput";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { StyledLoaderContainer } from "../upload/ConsistencyChecks";
import { useCurrentUserGroupsAccess } from "../../hooks/useCurrentUserGroupsAccess";
import i18n from "@eyeseetea/d2-ui-components/locales";
import styled from "styled-components";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useProgramQuestionnaireForm } from "./hook/useProgramQuestionnaireForm";
import { useHistory } from "react-router-dom";
import { red300 } from "material-ui/styles/colors";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { NamedRef } from "../../../domain/entities/Ref";

export interface ProgramQuestionnaireFormProps {
    hideForm?: () => void;
    readonly: boolean;
    signalId?: string;
    eventId?: string;
    parentEventId?: string;
    questionnaireId: string;
    hidePublish: boolean;
    subQuestionnaires?: NamedRef[];
    aggsubQuestionnaires?: NamedRef[];
    refreshGrid?: React.Dispatch<React.SetStateAction<{}>>;
}

const CancelButton = withStyles(() => ({
    root: {
        color: "white",
        backgroundColor: "#bd1818",
        "&:hover": {
            backgroundColor: red300,
        },
        marginRight: "10px",
    },
}))(Button);

export const ProgramQuestionnaireForm: React.FC<ProgramQuestionnaireFormProps> = props => {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { readAccessGroup, confidentialAccessGroup } = useCurrentUserGroupsAccess();
    const { currentPeriod } = useCurrentPeriodContext();
    const [refresh, setRefresh] = useState({});
    const [localAggSubQuestionnaires, setLocalAggSubQuestionnaires] = useState(props.aggsubQuestionnaires);
    const history = useHistory();

    const classes = useStyles();
    const formClasses = useFormStyles();
    const snackbar = useSnackbar();

    const { questionnaire, setQuestionnaire, loading, setLoading } = useProgramQuestionnaireForm(
        props.questionnaireId,
        props.eventId,
        props.parentEventId,
        props.aggsubQuestionnaires
    );

    const showSubmissionError = React.useCallback(
        (error: string) => {
            if (error && error.startsWith("EAR-IMPORT-ERROR:")) {
                snackbar.error(error.replace("EAR-IMPORT-ERROR:", i18n.t("Submission failed - ")));
            } else {
                console.error("Unknown Error during submission:", error);
                // TODO: return the permissions error from inner layers, use this for unknown errors
                snackbar.error(
                    "Submission Failed! You do not have the necessary permissions, please contact your administrator"
                );
            }
        },
        [snackbar]
    );

    const publishQuestionnaire = () => {
        setLoading(true);

        if (questionnaire && readAccessGroup.kind === "loaded" && confidentialAccessGroup.kind === "loaded") {
            const readAccessGroups = readAccessGroup.data.map(aag => {
                return aag.id;
            });
            const confidentialAccessGroups = confidentialAccessGroup.data.map(cag => {
                return cag.id;
            });

            compositionRoot.programQuestionnaires
                .importData(
                    props.signalId,
                    props.eventId,
                    questionnaire,
                    {
                        id: currentOrgUnitAccess.orgUnitId,
                        name: currentOrgUnitAccess.orgUnitName,
                        path: currentOrgUnitAccess.orgUnitPath,
                    },
                    currentPeriod,
                    { id: currentModuleAccess.moduleId, name: currentModuleAccess.moduleName },
                    "Publish",
                    readAccessGroups,
                    confidentialAccessGroups
                )
                .run(
                    () => {
                        snackbar.info("Submission Success!");
                        setLoading(false);
                        if (props.hideForm) props.hideForm();
                    },
                    error => {
                        showSubmissionError(error);
                        setLoading(false);
                    }
                );
        }
    };

    const saveQuestionnaire = () => {
        setLoading(true);

        if (questionnaire && readAccessGroup.kind === "loaded" && confidentialAccessGroup.kind === "loaded") {
            const readAccessGroups: string[] = readAccessGroup.data.map(aag => {
                return aag.id;
            });
            const confidentialAccessGroups: string[] = confidentialAccessGroup.data.map(cag => {
                return cag.id;
            });

            compositionRoot.programQuestionnaires
                .importData(
                    props.signalId,
                    props.eventId,
                    questionnaire,
                    {
                        id: currentOrgUnitAccess.orgUnitId,
                        name: currentOrgUnitAccess.orgUnitName,
                        path: currentOrgUnitAccess.orgUnitPath,
                    },
                    currentPeriod,
                    { id: currentModuleAccess.moduleId, name: currentModuleAccess.moduleName },
                    "Save",
                    readAccessGroups,
                    confidentialAccessGroups
                )
                .run(
                    () => {
                        snackbar.info("Submission Success!");
                        setLoading(false);
                        if (props.hideForm) props.hideForm();
                        if (props.refreshGrid) props.refreshGrid({});
                    },
                    error => {
                        showSubmissionError(error);
                        setLoading(false);
                    }
                );
        }
    };

    useEffect(() => {}, [refresh]);

    const updateQuestion = (question: Question) => {
        if (moduleProperties.get(currentModuleAccess.moduleName)?.applyQuestionnaireValidation) {
            setQuestionnaire(questionnaire => {
                if (questionnaire) {
                    const { updatedQuestionnaire, updatedAggSubQuestionnaires } =
                        compositionRoot.programQuestionnaires.applyValidations(
                            currentModuleAccess.moduleName,
                            question,
                            questionnaire,
                            localAggSubQuestionnaires
                        );
                    setLocalAggSubQuestionnaires(updatedAggSubQuestionnaires);
                    return updatedQuestionnaire;
                } else return questionnaire;
            });
            setRefresh({});
        } else {
            setQuestionnaire(questionnaire => {
                const sectionToBeUpdated = questionnaire?.sections.filter(sec =>
                    sec.questions.find(q => q.id === question?.id)
                );
                if (sectionToBeUpdated) {
                    const questionToBeUpdated = sectionToBeUpdated[0]?.questions.filter(q => q.id === question.id);
                    if (questionToBeUpdated && questionToBeUpdated[0]) questionToBeUpdated[0].value = question.value;
                }
                return questionnaire;
            });
        }
    };

    const onCancel = () => {
        if (props.hideForm) {
            props.hideForm();
        } else {
            history.goBack();
        }
    };

    return (
        <div>
            <Backdrop open={loading} style={{ color: "#fff", zIndex: 1 }}>
                <StyledLoaderContainer>
                    <CircularProgress color="inherit" size={50} />
                </StyledLoaderContainer>
            </Backdrop>
            <PageHeader title={questionnaire?.name || ""} />

            {questionnaire?.sections.map(section => {
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
                                    <DataTableRow key={question.id}>
                                        <DataTableCell width="60%">
                                            <span>{question.text}</span>
                                        </DataTableCell>

                                        <DataTableCell>
                                            <div className={formClasses.valueWrapper}>
                                                <div className={formClasses.valueInput}>
                                                    <QuestionWidget
                                                        onChange={updateQuestion}
                                                        question={question}
                                                        disabled={
                                                            props.readonly ? true : question.disabled ? true : false
                                                        }
                                                        infoText={question.infoText}
                                                    />
                                                </div>
                                            </div>
                                        </DataTableCell>
                                    </DataTableRow>
                                ))}
                            </TableBody>
                        </DataTable>
                    </div>
                );
            })}
            {!props.readonly && (
                <PageFooter>
                    <CancelButton variant="outlined" onClick={onCancel}>
                        {i18n.t("Cancel")}
                    </CancelButton>
                    <Button
                        style={{ marginRight: "10px" }}
                        variant="outlined"
                        color="primary"
                        onClick={saveQuestionnaire}
                    >
                        {props.hidePublish ? i18n.t("Save") : i18n.t("Save Draft")}
                    </Button>
                    {!props.hidePublish && (
                        <Button variant="contained" color="primary" onClick={publishQuestionnaire}>
                            {i18n.t("Publish")}
                        </Button>
                    )}
                </PageFooter>
            )}
        </div>
    );
};

const useFormStyles = makeStyles({
    valueInput: { flexGrow: 1 },
    valueWrapper: { display: "flex" },
});
const PageFooter = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    padding: 20px;
`;
