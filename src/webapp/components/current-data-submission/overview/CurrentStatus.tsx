import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Box, CircularProgress, Paper, Table, TableCell, TableContainer, TableHead, TableRow } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { CtaButtons } from "./CtaButtons";
import { CTAs } from "./StatusDetails";
import { useAppContext } from "../../../contexts/app-context";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { useLocation } from "react-router-dom";
import { QuestionnaireBase } from "../../../../domain/entities/Questionnaire";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { Close, Check } from "@material-ui/icons";
import { DataSubmissionStatusTypes } from "../../../../domain/entities/GlassDataSubmission";

interface StatusProps {
    moduleName: string;
    title: string;
    description: string;
    statusColor: string;
    leftCTAs: CTAs[];
    rightCTAs: CTAs[];
    showUploadHistory: boolean;
    isActionRequired: boolean;
    setRefetchStatus: Dispatch<SetStateAction<DataSubmissionStatusTypes | undefined>>;
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}

export const CurrentStatus: React.FC<StatusProps> = ({
    title,
    description,
    statusColor,
    leftCTAs,
    rightCTAs,
    showUploadHistory,
    isActionRequired,
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
    const snackbar = useSnackbar();

    const [questionnaires, setQuestionnaires] = useState<QuestionnaireBase[]>();
    const [uploadsCount, setUploadsCount] = useState<number>(0);

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
                () => {
                    snackbar.error(i18n.t("Error fetching questionnaires."));
                }
            );
            compositionRoot.glassUploads.getByModuleOUPeriod(moduleId, orgUnitId, year.toString()).run(
                glassUploads => {
                    setUploadsCount(glassUploads.length);
                },
                () => {
                    snackbar.error(i18n.t("Error fetching uploads."));
                }
            );
        }
    }, [
        compositionRoot.glassModules,
        compositionRoot.glassUploads,
        compositionRoot.questionnaires,
        moduleId,
        orgUnitId,
        showUploadHistory,
        snackbar,
        year,
    ]);

    return (
        <div>
            <Box sx={{ m: 2 }} />
            <div>
                <StyledCurrentStatusStr>{i18n.t("Current Status")}</StyledCurrentStatusStr>
                <Box display={"flex"} justifyContent={"space-between"}>
                    <StyledStatus statusColor={statusColor}>{i18n.t(title)}</StyledStatus>
                    {isActionRequired && <StyledInfoText>Action required</StyledInfoText>}
                </Box>
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
                            <TableCell>
                                <Box display={"flex"} alignItems="center">
                                    {`${uploadsCount} uploaded`}
                                    {uploadsCount > 0 && <Check style={{ color: "green" }}></Check>}
                                </Box>
                            </TableCell>
                        </TableRow>
                        {questionnaires && questionnaires[0] && (
                            <TableRow>
                                <TableCell>{`${questionnaires.length} Questionnaires`}</TableCell>
                                <TableCell>{`${questionnaires[0].isMandatory ? "Yes" : "No"}`}</TableCell>
                                <TableCell>
                                    <Box display={"flex"} alignItems="center">
                                        {`${questionnaires.filter(el => el.isCompleted).length} completed`}
                                        {questionnaires.filter(el => el.isCompleted).length < 1 ? (
                                            <Close color="error"></Close>
                                        ) : (
                                            <Check style={{ color: "green" }}></Check>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
                    </Table>
                </TableContainer>
            )}
            <Box display={"flex"} justifyContent="space-between" mt="20px">
                <Box>
                    <CtaButtons ctas={leftCTAs} setRefetchStatus={setRefetchStatus} setCurrentStep={setCurrentStep} />
                </Box>
                <Box>
                    <CtaButtons
                        ctas={rightCTAs}
                        position="right"
                        setRefetchStatus={setRefetchStatus}
                        setCurrentStep={setCurrentStep}
                    />
                </Box>
            </Box>
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
const StyledDescription = styled.span`
    margin: 0;
    line-height: 1.4;
`;

const StyledInfoText = styled.span`
    font-weight: bold;
`;
