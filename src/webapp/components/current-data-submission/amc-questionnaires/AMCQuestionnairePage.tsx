import React from "react";
import styled from "styled-components";

import { AMCQuestionnaireFormPage } from "./AMCQuestionnaireFormPage";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { useCurrentPeriodContext } from "../../../contexts/current-period-context";
import { Id } from "../../../../domain/entities/Ref";
import i18n from "../../../../locales";
import { Icon, IconButton, Typography } from "@material-ui/core";
import { QuestionnairesTable } from "../../questionnaires-table/QuestionnairesTable";
import { useAMCQuestionnairPage } from "./useAMCQuestionnairPage";
import { AMCQuestionnaireFormType } from "./presentation-entities/AMCQuestionnaireFormType";

type AMCQuestionnairePageProps = {
    id?: Id;
    formType: AMCQuestionnaireFormType;
    title: string;
    onCloseQuestionnaireForm: () => void;
};

export const AMCQuestionnairePage: React.FC<AMCQuestionnairePageProps> = props => {
    const { id, formType, title, onCloseQuestionnaireForm } = props;

    const { currentPeriod } = useCurrentPeriodContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();

    const {
        questionnaireRows,
        isEditMode,
        questionnaireIdToEdit,
        onClickAddOrEdit,
        onCancelForm,
        onSaveForm,
        questionnaire,
    } = useAMCQuestionnairPage(formType, id);

    const disabledAddNew = formType === "am-class-questionnaire" ? !questionnaire?.canAddAMClassQuestionnaire() : false;

    return (
        <div>
            <Header>
                <CloseButton
                    onClick={onCloseQuestionnaireForm}
                    color="secondary"
                    aria-label={i18n.t("Back")}
                    data-test={"page-header-back"}
                >
                    <Icon color="primary">arrow_back</Icon>
                </CloseButton>

                <Title variant="h5" gutterBottom data-test={"page-header-title"}>
                    {title}
                </Title>
            </Header>

            <QuestionnaireTableContainer>
                <QuestionnairesTable
                    title={
                        formType === "am-class-questionnaire"
                            ? i18n.t("AM Questionnaire Editor")
                            : i18n.t("Component Questionnaire Editor")
                    }
                    rows={questionnaireRows}
                    onClickEdit={(_event, id: Id) => onClickAddOrEdit(id)}
                    onClickAddNew={() => onClickAddOrEdit()}
                    disabledAddNew={disabledAddNew}
                />
            </QuestionnaireTableContainer>

            <QuestionnaireFormContainer>
                <AMCQuestionnaireFormPage
                    formType={formType}
                    id={questionnaireIdToEdit}
                    orgUnitId={currentOrgUnitAccess.orgUnitId}
                    period={currentPeriod}
                    isViewOnlyMode={!isEditMode}
                    showFormButtons={isEditMode}
                    onSave={onSaveForm}
                    onCancel={onCancelForm}
                />
            </QuestionnaireFormContainer>
        </div>
    );
};

const Header = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 16px;
`;

const Title = styled(Typography)`
    display: inline-block;
    font-weight: 300;
    color: black;
    margin-block-end: 5px;
`;

const CloseButton = styled(IconButton)`
    padding-top: 10px;
    margin-bottom: 5x;
`;

const QuestionnaireTableContainer = styled.div`
    margin-block-end: 40px;
`;

const QuestionnaireFormContainer = styled.div`
    border: 1px solid #ccc;
    padding: 16px;
`;
