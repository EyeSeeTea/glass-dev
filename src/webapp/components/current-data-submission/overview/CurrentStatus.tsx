import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Box, CircularProgress, Paper, Table, TableCell, TableContainer, TableHead, TableRow } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { CtaButtons } from "./CtaButtons";
import { StatusCTAs } from "./StatusDetails";
import { useAppContext } from "../../../contexts/app-context";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { useLocation } from "react-router-dom";
import { QuestionnaireBase } from "../../../../domain/entities/Questionnaire";
import { DataSubmissionStatusTypes } from "../../../../domain/entities/GlassDataSubmission";

interface StatusProps {
    moduleName: string;
    title: string;
    description: string;
    statusColor: string;
    ctas: StatusCTAs[];
    showUploadHistory: boolean;
    setRefetchStatus: Dispatch<SetStateAction<DataSubmissionStatusTypes | undefined>>;
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}

export const CurrentStatus: React.FC<StatusProps> = ({
    title,
    description,
    statusColor,
    ctas,
    showUploadHistory,
    setRefetchStatus,
    setCurrentStep,
}) => {
    const { compositionRoot } = useAppContext();
    const location = useLocation();
    const {
        currentModuleAccess: { moduleId },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { orgUnitId },
    } = useCurrentOrgUnitContext();

    const [questionnaires, setQuestionnaires] = useState<QuestionnaireBase[]>();

    const queryParameters = new URLSearchParams(location.search);
    const periodFromUrl = parseInt(queryParameters.get("period") || "");
    const year = periodFromUrl || new Date().getFullYear() - 1;

    useEffect(() => {
        if (showUploadHistory) {
            compositionRoot.glassModules.getById(moduleId).run(
                currentModule => {
                    compositionRoot.questionnaires.getList(currentModule, { orgUnitId, year }).run(
                        questionnairesData => {
                            setQuestionnaires(questionnairesData);
                        },
                        () => {}
                    );
                },
                () => {}
            );
        }
    });

    return (
        <div>
            <Box sx={{ m: 2 }} />
            <div>
                <StyledCurrentStatusStr>{i18n.t("Current Status")}</StyledCurrentStatusStr>
                <StyledStatus statusColor={statusColor}>{i18n.t(title)}</StyledStatus>
            </div>
            <Box sx={{ m: 2 }} />
            <StyledDescription>{i18n.t(description)}</StyledDescription>
            {showUploadHistory && (
                <TableContainer component={Paper} style={{ marginTop: "10px" }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>{i18n.t("Content")}</TableCell>
                                <TableCell>{i18n.t("Mandatory")}</TableCell>
                                <TableCell>{i18n.t("State")}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableRow>
                            <TableCell>{`Up to 6 datasets`}</TableCell>
                            <TableCell>{`No`}</TableCell>
                            <TableCell>{`0 uploaded`}</TableCell>
                        </TableRow>
                        {questionnaires ? (
                            <TableRow>
                                <TableCell>{`${questionnaires.length} Questionnaires`}</TableCell>
                                <TableCell>{`${questionnaires[0]?.isMandatory ? "Yes" : "No"}`}</TableCell>
                                <TableCell>{`${
                                    questionnaires.filter(el => el.isCompleted).length
                                } completed`}</TableCell>
                            </TableRow>
                        ) : (
                            <TableRow>
                                <TableCell />
                                <TableCell>
                                    <CircularProgress size={25} />
                                </TableCell>
                                <TableCell />
                            </TableRow>
                        )}
                    </Table>
                </TableContainer>
            )}
            <CtaButtons ctas={ctas} setRefetchStatus={setRefetchStatus} setCurrentStep={setCurrentStep} />
        </div>
    );
};

const StyledCurrentStatusStr = styled.small`
    text-transform: uppercase;
    font-weight: bold;
    font-size: 13px;
    display: block;
    opacity: 0.7;
`;
const StyledStatus = styled.span<{ statusColor: string }>`
    text-transform: uppercase;
    font-weight: 500;
    color: ${props => props.statusColor};
`;
const StyledDescription = styled.p`
    margin: 0;
    line-height: 1.4;
`;
