import { Button, CircularProgress } from "@material-ui/core";
import React from "react";
import i18n from "@eyeseetea/d2-ui-components/locales";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { QuestionnarieFormProps } from "./QuestionnaireForm";
import { useStatusDataSubmission } from "../../hooks/useStatusDataSubmission";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useLocation } from "react-router-dom";
import { ContentLoader } from "../content-loader/ContentLoader";

interface QuestionnaireHeaderProps {
    description: string;
    isCompleted: boolean;
    isSaving: boolean;
    setAsCompleted: (isCompleted: boolean) => void;
    mode: QuestionnarieFormProps["mode"];
}

export const QuestionnaireActions: React.FC<QuestionnaireHeaderProps> = props => {
    const { description, isCompleted, isSaving, mode, setAsCompleted } = props;
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const location = useLocation();
    const queryParameters = new URLSearchParams(location.search);
    const periodFromUrl = parseInt(queryParameters.get("period") || "");
    const year = periodFromUrl || new Date().getFullYear() - 1;

    const currentDataSubmissionStatus = useStatusDataSubmission(
        currentModuleAccess.moduleId,
        currentOrgUnitAccess.orgUnitId,
        year
    );

    return (
        <ContentLoader content={currentDataSubmissionStatus}>
            <QuestionnaireHeaderStyled>
                {mode === "show" && (
                    <>
                        {isCompleted ? (
                            <span className="comp completed">{i18n.t("Completed")}</span>
                        ) : (
                            <span className="comp">{i18n.t("Not completed")}</span>
                        )}
                    </>
                )}

                {mode === "edit" && (
                    <div className="buttons">
                        {isSaving && <CircularProgress size={22} />}

                        {currentDataSubmissionStatus.kind === "loaded" &&
                            (currentDataSubmissionStatus.data.title === "NOT COMPLETED" ||
                                currentDataSubmissionStatus.data.title === "DATA TO BE APROVED BY COUNTRY") && (
                                <>
                                    {isCompleted ? (
                                        <Button
                                            onClick={() => setAsCompleted(false)}
                                            variant="contained"
                                            color="secondary"
                                        >
                                            {i18n.t("Set as incomplete")}
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => setAsCompleted(true)}
                                            variant="contained"
                                            color="primary"
                                        >
                                            {i18n.t("Set as completed")}
                                        </Button>
                                    )}
                                </>
                            )}
                    </div>
                )}

                <div className="head">
                    <span className="desc">{description}</span>
                </div>
            </QuestionnaireHeaderStyled>
        </ContentLoader>
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
