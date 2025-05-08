import React, { useEffect } from "react";
import styled from "styled-components";
import { Button, CircularProgress } from "@material-ui/core";
import { useSnackbar } from "@eyeseetea/d2-ui-components";

import { AMCQuestionnaireFormPage } from "./AMCQuestionnaireFormPage";
import { useCurrentPeriodContext } from "../../../contexts/current-period-context";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { AMCQuestionnaireOptionsContextProvider } from "../../../context-providers/AMCQuestionnaireOptionsContextProvider";
import { useMainPageAMCQuestionnaire } from "./useMainPageAMCQuestionnaire";
import i18n from "../../../../locales";
import { AMCQuestionnaireContextProvider } from "../../../context-providers/AMCQuestionnaireContextProvider";

type QuestionnairesProps = {};

export const AMCQuestionnaires: React.FC<QuestionnairesProps> = () => {
    const snackbar = useSnackbar();

    const { currentPeriod } = useCurrentPeriodContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const {
        globalMessage,
        isLoading,
        generalAMCQuestionnaireId,
        isEditMode,
        onClickAddOrEdit,
        onCancelForm,
        onSaveForm,
    } = useMainPageAMCQuestionnaire();

    useEffect(() => {
        if (!globalMessage) return;

        snackbar[globalMessage.type](globalMessage.text);
    }, [globalMessage, snackbar]);

    return (
        <AMCQuestionnaireOptionsContextProvider>
            <AMCQuestionnaireContextProvider>
                <ButtonsContainer>
                    <Button onClick={onClickAddOrEdit} disabled={isEditMode} variant="contained" color="primary">
                        {generalAMCQuestionnaireId ? i18n.t("Edit") : i18n.t("Add")}
                    </Button>
                </ButtonsContainer>

                {isLoading ? (
                    <LoaderContainer>
                        <CircularProgress />
                    </LoaderContainer>
                ) : (
                    <QuestionnairesContainer>
                        <GeneralQuestionnaireContainer>
                            <AMCQuestionnaireFormPage
                                formType="general-questionnaire"
                                id={generalAMCQuestionnaireId}
                                orgUnitId={currentOrgUnitAccess.orgUnitId}
                                period={currentPeriod}
                                isViewOnlyMode={!isEditMode}
                                showFormButtons={isEditMode}
                                onSave={onSaveForm}
                                onCancel={onCancelForm}
                            />
                        </GeneralQuestionnaireContainer>
                        <QuestionnairesTableContainer></QuestionnairesTableContainer>
                    </QuestionnairesContainer>
                )}
            </AMCQuestionnaireContextProvider>
        </AMCQuestionnaireOptionsContextProvider>
    );
};

const ButtonsContainer = styled.div``;

const QuestionnairesContainer = styled.div``;

const LoaderContainer = styled.div``;

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
