import React from "react";
import styled from "styled-components";
import { Button, CircularProgress, Typography } from "@material-ui/core";

import { AMCQuestionnaireFormPage } from "./AMCQuestionnaireFormPage";
import { useCurrentPeriodContext } from "../../../contexts/current-period-context";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { useMainPageAMCQuestionnaire } from "./useMainPageAMCQuestionnaire";
import i18n from "../../../../locales";
import { QuestionnairesTable } from "../../questionnaires-table/QuestionnairesTable";
import { Id } from "../../../../domain/entities/Ref";
import { AMCQuestionnairePage } from "./AMCQuestionnairePage";
import { MissingComponentQuestionnaires } from "./MissingComponentQuestionnaires";
import { palette } from "../../../pages/app/themes/dhis2.theme";

export const MainPageAMCQuestionnaires: React.FC = () => {
    const { currentPeriod } = useCurrentPeriodContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const {
        questionnaire,
        amClassQuestionnaireRows,
        componentQuestionnaireRows,
        isLoading,
        isEditMode,
        openQuestionnaire,
        onClickAddOrEdit,
        onCancelForm,
        onSaveForm,
        openQuestionnaireForm,
        onCloseQuestionnaireForm,
        questionnaireError,
    } = useMainPageAMCQuestionnaire();

    return (
        <Container>
            {openQuestionnaire && questionnaire ? (
                <AMCQuestionnairePage
                    formType={openQuestionnaire.formType}
                    openQuestionnaireId={openQuestionnaire.id}
                    onCloseQuestionnaireForm={onCloseQuestionnaireForm}
                    title={openQuestionnaire.title}
                    questionnaire={questionnaire}
                />
            ) : (
                <div>
                    {isLoading ? (
                        <LoaderContainer>
                            <CircularProgress />
                        </LoaderContainer>
                    ) : questionnaireError ? (
                        <ErrorContainer>
                            <Typography variant="h6">{i18n.t("Error loading AMC Questionnaire")}</Typography>
                            <Typography variant="body1">
                                {i18n.t("This may be due to a network issue or a data inconsistency. ")}
                            </Typography>
                            <Typography variant="body1">
                                {i18n.t(
                                    "Please check the error details below, correct any issues with the event, and try again. If the problem persists, contact support for assistance."
                                )}
                            </Typography>
                            <Typography variant="caption" style={{ marginTop: "1em" }} paragraph>
                                {questionnaireError.message}
                            </Typography>
                        </ErrorContainer>
                    ) : (
                        <QuestionnairesContainer>
                            <ButtonsContainer>
                                <Button
                                    onClick={onClickAddOrEdit}
                                    disabled={isEditMode}
                                    variant="contained"
                                    color="primary"
                                >
                                    {questionnaire?.id ? i18n.t("Edit") : i18n.t("Add")}
                                </Button>
                            </ButtonsContainer>

                            <GeneralQuestionnaireContainer>
                                <AMCQuestionnaireFormPage
                                    formType="general-questionnaire"
                                    id={questionnaire?.id}
                                    orgUnitId={currentOrgUnitAccess.orgUnitId}
                                    period={currentPeriod}
                                    isViewOnlyMode={!isEditMode}
                                    showFormButtons={isEditMode}
                                    onSave={onSaveForm}
                                    onCancel={onCancelForm}
                                />
                            </GeneralQuestionnaireContainer>

                            {questionnaire?.id ? (
                                <QuestionnairesTableContainer>
                                    <QuestionnairesTable
                                        title={i18n.t("Data structure")}
                                        rows={amClassQuestionnaireRows}
                                        onClickEdit={(_event, id: Id) => {
                                            openQuestionnaireForm("am-class-questionnaire", id);
                                        }}
                                        onClickAddNew={() => {
                                            openQuestionnaireForm("am-class-questionnaire");
                                        }}
                                        disabledAddNew={!questionnaire.canAddAMClassQuestionnaire()}
                                    />

                                    <QuestionnairesTable
                                        title={i18n.t("Data characteristics")}
                                        rows={componentQuestionnaireRows}
                                        onClickEdit={(_event, id: Id) => {
                                            openQuestionnaireForm("component-questionnaire", id);
                                        }}
                                        onClickAddNew={() => {
                                            openQuestionnaireForm("component-questionnaire");
                                        }}
                                        disabledAddNew={!questionnaire.canAddComponentQuestionnaire()}
                                    >
                                        <MissingComponentQuestionnaires
                                            value={questionnaire.getRemainingComponentCombinations()}
                                        />
                                    </QuestionnairesTable>
                                </QuestionnairesTableContainer>
                            ) : null}
                        </QuestionnairesContainer>
                    )}
                </div>
            )}
        </Container>
    );
};

const Container = styled.div``;

const ButtonsContainer = styled.div`
    margin-block-end: 20px;
`;

const QuestionnairesContainer = styled.div``;

const LoaderContainer = styled.div``;

const ErrorContainer = styled.div`
    border: 1px solid ${palette.error.main};
    color: ${palette.error.main};
    padding: 2em;
`;

const GeneralQuestionnaireContainer = styled.div`
    border: 1px solid #ccc;
    padding: 16px;
`;

const QuestionnairesTableContainer = styled.div`
    display: flex;
    width: 100%;
    gap: 40px;
    margin-block-start: 40px;
`;
