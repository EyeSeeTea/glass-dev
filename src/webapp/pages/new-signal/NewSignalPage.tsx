import React, { useEffect, useState } from "react";
import { Breadcrumbs, Button } from "@material-ui/core";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { NavLink } from "react-router-dom";
import i18n from "@eyeseetea/d2-ui-components/locales";
import styled from "styled-components";
import { glassColors, palette } from "../app/themes/dhis2.theme";
// @ts-ignore
import { DataTable, TableHead, DataTableRow, DataTableColumnHeader, TableBody } from "@dhis2/ui";
import QuestionRow from "../../components/questionnaire/QuestionRow";
import { useStyles } from "../../components/questionnaire/QuestionnaireForm";
import { useAppContext } from "../../contexts/app-context";
import { Questionnaire } from "../../../domain/entities/Questionnaire";
import { PageHeader } from "../../components/page-header/PageHeader";
import { useSnackbar } from "@eyeseetea/d2-ui-components";

export const NewSignalPage: React.FC = React.memo(() => {
    const { currentModuleAccess } = useCurrentModuleContext();
    const { compositionRoot } = useAppContext();
    const [questionnaire, setQuestionnaire] = useState<Questionnaire>();
    const [formVisibility, setFormVisibility] = useState<boolean>(false);
    const classes = useStyles();
    const snackbar = useSnackbar();

    useEffect(() => {
        return compositionRoot.captureForm.getForm().run(
            questionnaireForm => {
                setQuestionnaire(questionnaireForm);
            },
            err => snackbar.error(err)
        );
    }, [compositionRoot, snackbar]);

    const setQuestion = () => {
        console.debug("Set Question called");
    };

    const showForm = () => {
        setFormVisibility(true);
    };

    const hideForm = () => {
        snackbar.info("Submission Success!");
        setFormVisibility(false);
    };

    return (
        <ContentWrapper>
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
                                            <QuestionRow
                                                key={question.id}
                                                disabled={false}
                                                question={question}
                                                setQuestion={setQuestion}
                                            />
                                        ))}
                                    </TableBody>
                                </DataTable>
                            </div>
                        );
                    })}

                    <PageFooter>
                        <Button variant="contained" color="primary" onClick={hideForm}>
                            {i18n.t("Submit")}
                        </Button>
                    </PageFooter>
                </div>
            )}
        </ContentWrapper>
    );
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
