import { Button, CircularProgress } from "@material-ui/core";
import React from "react";
import i18n from "@eyeseetea/d2-ui-components/locales";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { QuestionnarieFormProps } from "./QuestionnaireForm";
import { useGlassCaptureAccess } from "../../hooks/useGlassCaptureAccess";

interface QuestionnaireHeaderProps {
    description: string;
    isCompleted: boolean;
    isSaving: boolean;
    setAsCompleted: (isCompleted: boolean) => void;
    mode: QuestionnarieFormProps["mode"];
    saveQuestionnaireActions: {
        saveQuestionnaire: () => void;
        disableSave: boolean;
        isSavingQuestionnaire: boolean;
    };
}

export const QuestionnaireActions: React.FC<QuestionnaireHeaderProps> = props => {
    const { isCompleted, isSaving, mode, saveQuestionnaireActions, setAsCompleted } = props;
    const { saveQuestionnaire, disableSave, isSavingQuestionnaire } = saveQuestionnaireActions;
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess();

    return (
        <QuestionnaireHeaderStyled>
            {mode === "show" && (
                <>
                    {hasCurrentUserCaptureAccess &&
                        (isCompleted ? (
                            <span className="comp completed">{i18n.t("Completed")}</span>
                        ) : (
                            <span className="comp">{i18n.t("Not completed")}</span>
                        ))}
                </>
            )}

            {mode === "edit" && (
                <div className="buttons">
                    {isSavingQuestionnaire && <CircularProgress size={22} />}
                    <StyledButton
                        variant="contained"
                        color="primary"
                        onClick={saveQuestionnaire}
                        disabled={disableSave}
                    >
                        {i18n.t("Save Questionnaire")}
                    </StyledButton>

                    {isSaving && <CircularProgress size={22} />}
                    {isCompleted ? (
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
        </QuestionnaireHeaderStyled>
    );
};

const QuestionnaireHeaderStyled = styled.div`
    .head {
        * {
            display: block;
        }
    }

    .desc {
        margin-left: 14px;
        white-space: pre-wrap;
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

const StyledButton = styled(Button)`
    margin: 8px;
`;
