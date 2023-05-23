import React, { useEffect, useState } from "react";
import { Box, Paper, Table, TableCell, TableContainer, TableHead, TableRow } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { CtaButtons } from "./CtaButtons";
import { CTAs } from "./StatusDetails";
import { useAppContext } from "../../../contexts/app-context";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { QuestionnaireBase } from "../../../../domain/entities/Questionnaire";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { Close, Check } from "@material-ui/icons";
import { useCurrentPeriodContext } from "../../../contexts/current-period-context";
import { useGlassCaptureAccess } from "../../../hooks/useGlassCaptureAccess";
import { palette } from "../../../pages/app/themes/dhis2.theme";

interface StatusProps {
    moduleName: string;
    title: string;
    description: string;
    statusColor: string;
    leftCTAs: CTAs[];
    rightCTAs: CTAs[];
    showUploadHistory: boolean;
    isActionRequired: boolean;
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}

const COMPLETED_STATUS = "COMPLETED";

export const CurrentStatus: React.FC<StatusProps> = ({
    title,
    description,
    statusColor,
    leftCTAs,
    rightCTAs,
    showUploadHistory,
    isActionRequired,
    setCurrentStep,
}) => {
    const { compositionRoot } = useAppContext();
    const {
        currentModuleAccess: { moduleId },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { orgUnitId },
    } = useCurrentOrgUnitContext();
    const snackbar = useSnackbar();
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess() ? true : false;

    const [questionnaires, setQuestionnaires] = useState<QuestionnaireBase[]>();
    const [uploadsCount, setUploadsCount] = useState<number>(0);
    const { currentPeriod } = useCurrentPeriodContext();

    useEffect(() => {
        if (showUploadHistory) {
            compositionRoot.glassModules.getById(moduleId).run(
                currentModule => {
                    compositionRoot.questionnaires
                        .getList(currentModule, { orgUnitId, year: currentPeriod }, hasCurrentUserCaptureAccess)
                        .run(
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
            compositionRoot.glassUploads.getByModuleOUPeriod(moduleId, orgUnitId, currentPeriod.toString()).run(
                glassUploads => {
                    const completedUploads = glassUploads.filter(({ status }) => status === COMPLETED_STATUS);
                    setUploadsCount(completedUploads.length);
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
        currentPeriod,
        hasCurrentUserCaptureAccess,
    ]);

    return (
        <div>
            <Box sx={{ m: 2 }} />
            <div>
                <StyledCurrentStatusStr>{i18n.t("Current Status")}</StyledCurrentStatusStr>
                <Box display={"flex"} justifyContent={"space-between"}>
                    <StyledStatus statusColor={statusColor}>{i18n.t(title)}</StyledStatus>
                    {isActionRequired && (
                        <StyledInfoText statusColor={statusColor}>!&nbsp;&nbsp; &nbsp;Action required</StyledInfoText>
                    )}
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
                        <tbody>
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
                                        {hasCurrentUserCaptureAccess ? (
                                            <Box display={"flex"} alignItems="center">
                                                {/* Only user with capture access, can see the Questionnaire complete status */}

                                                {`${questionnaires.filter(el => el.isCompleted).length} completed`}
                                                {questionnaires.filter(el => el.isCompleted).length < 1 ? (
                                                    <Close color="error"></Close>
                                                ) : (
                                                    <Check style={{ color: "green" }}></Check>
                                                )}
                                            </Box>
                                        ) : (
                                            <Box>No Access</Box>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )}
                        </tbody>
                    </Table>
                </TableContainer>
            )}
            <Box display={"flex"} justifyContent="space-between" mt="20px">
                <Box>
                    <CtaButtons ctas={leftCTAs} setCurrentStep={setCurrentStep} />
                </Box>
                <Box>
                    <CtaButtons ctas={rightCTAs} position="right" setCurrentStep={setCurrentStep} />
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

export const StyledInfoText = styled.span<{ statusColor: string }>`
    text-transform: uppercase;
    background: ${props => props.statusColor};
    color: ${palette.common.white};
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    padding: 3px 3px;
    margin-bottom: 10px;

    width: 152px;
    height: 20px;
    border-radius: 16px;
    font-family: "Roboto";
    font-style: normal;
    font-weight: 500;
    font-size: 13px;
    line-height: 18px;
    letter-spacing: 0.16px;
`;
