import React, { useEffect, useState } from "react";
import { Backdrop, Breadcrumbs, Button, CircularProgress, makeStyles } from "@material-ui/core";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { NavLink } from "react-router-dom";
import i18n from "@eyeseetea/d2-ui-components/locales";
import styled from "styled-components";
import { glassColors, palette } from "../app/themes/dhis2.theme";
// @ts-ignore
import { DataTable, TableHead, DataTableRow, DataTableColumnHeader, TableBody, DataTableCell } from "@dhis2/ui";
import { useStyles } from "../../components/questionnaire/QuestionnaireForm";
import { useAppContext } from "../../contexts/app-context";
import { Question, Questionnaire } from "../../../domain/entities/Questionnaire";
import { PageHeader } from "../../components/page-header/PageHeader";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { QuestionWidget } from "../../components/questionnaire/QuestionInput";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { StyledLoaderContainer } from "../../components/upload/ConsistencyChecks";

export const NewSignalPage: React.FC = React.memo(() => {
    const { currentModuleAccess } = useCurrentModuleContext();
    const { compositionRoot } = useAppContext();
    const [questionnaire, setQuestionnaire] = useState<Questionnaire>();
    const [formVisibility, setFormVisibility] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();

    const classes = useStyles();
    const formClasses = useFormStyles();
    const snackbar = useSnackbar();

    useEffect(() => {
        return compositionRoot.captureForm.getForm().run(
            questionnaireForm => {
                setQuestionnaire(questionnaireForm);
            },
            err => snackbar.error(err)
        );
    }, [compositionRoot, snackbar]);

    const showForm = () => {
        setFormVisibility(true);
    };

    const submitQuestionnaire = () => {
        setLoading(true);

        if (questionnaire) {
            compositionRoot.captureForm
                .importData(questionnaire, currentOrgUnitAccess.orgUnitId, currentModuleAccess.moduleId, "Submit")
                .run(
                    () => {
                        snackbar.info("Submission Success!");
                        setLoading(false);
                        setFormVisibility(false);
                    },
                    () => {
                        snackbar.error("Submission Failed!");
                        setLoading(false);
                        setFormVisibility(false);
                    }
                );
        }
    };

    const updateQuestion = (question: Question) => {
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
    };

    return (
        <ContentWrapper>
            <Backdrop open={loading} style={{ color: "#fff", zIndex: 1 }}>
                <StyledLoaderContainer>
                    <CircularProgress color="inherit" size={50} />
                    {/* <Typography variant="h6">{i18n.t("Importing data and applying validation rules")}</Typography>
                    <Typography variant="h5">
                        {i18n.t("This might take several minutes, do not refresh the page or press back.")}
                    </Typography> */}
                </StyledLoaderContainer>
            </Backdrop>
            <PreContent>
                <StyledBreadCrumbs aria-label="breadcrumb" separator="">
                    <Button component={NavLink} to={`/new-signal`} exact={true}>
                        <span>{currentModuleAccess.moduleName}</span>
                    </Button>
                    <ChevronRightIcon />
                    <Button component={NavLink} to={`new-signal`} exact={true}>
                        <span>{i18n.t(`New Signal`)}</span>
                    </Button>
                </StyledBreadCrumbs>
            </PreContent>
            {!formVisibility && (
                <CenteredDiv>
                    <Button variant="contained" color="primary" onClick={showForm}>
                        {i18n.t("Draft New Signal")}
                    </Button>
                </CenteredDiv>
            )}
            {formVisibility && (
                <div>
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
                                                                disabled={false}
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

                    <PageFooter>
                        <Button variant="contained" color="primary" onClick={submitQuestionnaire}>
                            {i18n.t("Submit")}
                        </Button>
                    </PageFooter>
                </div>
            )}
        </ContentWrapper>
    );
});

const useFormStyles = makeStyles({
    valueInput: { flexGrow: 1 },
    valueWrapper: { display: "flex" },
});

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const PreContent = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    .info {
        font-size: 14px;
        span {
            opacity: 0.5;
        }
        span:nth-child(1) {
            color: ${glassColors.green};
            opacity: 1;
        }
    }
`;

const StyledBreadCrumbs = styled(Breadcrumbs)`
    color: ${glassColors.mainPrimary};
    font-weight: 400;
    text-transform: uppercase;
    li {
        display: flex;
        align-items: center;
        p {
            padding: 6px 8px;
        }
        .MuiButton-root {
            span {
                color: ${glassColors.mainPrimary};
                font-size: 15px;
            }
        }
    }
    .MuiBreadcrumbs-separator {
        display: none;
    }
    svg {
        color: ${palette.text.secondary};
    }
`;
const CenteredDiv = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;

const PageFooter = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
`;
