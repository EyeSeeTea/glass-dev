import React, { useEffect, useState } from "react";
import { Box, Button, Container, Typography } from "@material-ui/core";
import styled from "styled-components";
import { CustomCard } from "../custom-card/CustomCard";
import StarIcon from "@material-ui/icons/Star";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import WarningIcon from "@material-ui/icons/WarningOutlined";
import i18n from "../../../locales";
import { NavLink } from "react-router-dom";
import { GlassModule } from "../../../domain/entities/GlassModule";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useAppContext } from "../../contexts/app-context";
import { QuestionnaireBase } from "../../../domain/entities/Questionnaire";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { StyledInfoText } from "../current-data-submission/overview/CurrentStatus";
import { useStatusDataSubmission } from "../../hooks/useStatusDataSubmission";
import { CircularProgress } from "material-ui";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";

interface ModuleCardProps {
    period: string;
    module: GlassModule;
}

const COMPLETED_STATUS = "COMPLETED";

export const ModuleCard: React.FC<ModuleCardProps> = ({ period, module }) => {
    const { changeCurrentModuleAccess } = useCurrentModuleContext();
    const { changeCurrentPeriod } = useCurrentPeriodContext();
    const { compositionRoot, currentUser } = useAppContext();

    const {
        currentOrgUnitAccess: { orgUnitId },
    } = useCurrentOrgUnitContext();
    const snackbar = useSnackbar();

    const endDays = 0; //TO DO : Calculate days left in the open period. Need confirmation on open and close days.

    const [questionnaires, setQuestionnaires] = useState<QuestionnaireBase[]>([]);
    const [uploadsCount, setUploadsCount] = useState<number>(0);
    const currentDataSubmissionStatus = useStatusDataSubmission(module.id, orgUnitId, period, module.name);

    const updateModuleAndPeriodContext = () => {
        changeCurrentModuleAccess(module?.name || "");
        changeCurrentPeriod(period);
    };

    useEffect(() => {
        if (moduleProperties.get(module.name)?.isQuestionnaireReq) {
            const moduleCaptureAccess = currentUser.userModulesAccess.find(
                m => m.moduleId === module.id
            )?.captureAccess;
            const orgUnitCaptureAccess = currentUser.userOrgUnitsAccess.find(
                ou => (ou.orgUnitId = orgUnitId)
            )?.captureAccess;
            const hasCurrentUserCaptureAccess =
                (moduleCaptureAccess ? moduleCaptureAccess : false) &&
                (orgUnitCaptureAccess ? orgUnitCaptureAccess : false);

            compositionRoot.glassModules.getById(module.id).run(
                currentModule => {
                    compositionRoot.questionnaires
                        .getList(currentModule, { orgUnitId, year: period }, hasCurrentUserCaptureAccess)
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
        }
        compositionRoot.glassUploads.getByModuleOUPeriod(module.id, orgUnitId, period.toString()).run(
            glassUploads => {
                const completedUploads = glassUploads.filter(({ status }) => status === COMPLETED_STATUS);
                setUploadsCount(completedUploads.length);
            },
            () => {
                snackbar.error(i18n.t("Error fetching uploads."));
            }
        );
    }, [
        compositionRoot.glassModules,
        compositionRoot.glassUploads,
        compositionRoot.questionnaires,
        currentUser.userModulesAccess,
        currentUser.userOrgUnitsAccess,
        module.id,
        module.name,
        orgUnitId,
        period,
        snackbar,
    ]);

    return (
        <CustomCard padding="0">
            <TitleContainer moduleColor={module?.color || ""}>
                <StarIcon />
                <h3>{`${module?.name} ${period}`}</h3>
            </TitleContainer>

            <ContentContainer moduleColor={module?.color || ""}>
                <Container style={{ padding: 0 }}>
                    {currentDataSubmissionStatus.kind === "loaded" ? (
                        <ActionRequiredContainer>
                            <StyledInfoText statusColor={currentDataSubmissionStatus.data.colour}>
                                !&nbsp;&nbsp; &nbsp;Action required
                            </StyledInfoText>
                            <Typography
                                style={{
                                    color: currentDataSubmissionStatus.data.colour,
                                    paddingLeft: "5px",
                                    alignSelf: "baseline",
                                }}
                            >
                                {currentDataSubmissionStatus.data.actionReqText}
                            </Typography>
                        </ActionRequiredContainer>
                    ) : (
                        <CircularProgress />
                    )}
                    {endDays ? (
                        <Box display={"flex"} flexDirection="row">
                            <WarningIcon htmlColor={glassColors.mainTertiary} />
                            <Box width={10} />
                            <Typography style={{ color: glassColors.mainTertiary }}>
                                {i18n.t(`END IN ${endDays} DAYS`)}
                            </Typography>
                        </Box>
                    ) : (
                        <Typography color="textSecondary">{i18n.t("OPEN ALL YEAR")}</Typography>
                    )}
                    <Typography color="textSecondary">{i18n.t(`${uploadsCount} files uploaded`)}</Typography>
                    {moduleProperties.get(module.name)?.isQuestionnaireReq && (
                        <Typography color="textSecondary">
                            {i18n.t(
                                `${questionnaires.filter(q => q.isCompleted === true)?.length} questionnaires completed`
                            )}
                        </Typography>
                    )}
                </Container>

                <Button
                    variant="contained"
                    color="primary"
                    component={NavLink}
                    to={`/current-data-submission`}
                    onClick={updateModuleAndPeriodContext}
                    exact={true}
                >
                    <span>{i18n.t("GO")}</span>
                </Button>
            </ContentContainer>
        </CustomCard>
    );
};

const TitleContainer = styled.div<{ moduleColor: string }>`
    background-color: ${props => props.moduleColor};
    padding: 20px;
    margin: 0;
    display: flex;
    flex-direction: row;
    gap: 10px;
    align-items: center;
    svg {
        color: white;
        font-size: 24px;
    }
    h3 {
        margin: 0;
        font-weight: 500;
        color: white;
        font-size: 24px;
    }
`;

const ContentContainer = styled.div<{ moduleColor: string }>`
    border-radius: 10px;
    padding: 15px 10px;
    margin: 12px 20px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: end;
    button,
    a {
        background-color: ${props => props.moduleColor};
        &:hover {
            background-color: ${props => props.moduleColor};
            box-shadow: none;
        }
    }
`;

const ActionRequiredContainer = styled.span`
    padding: 10px 5px;
    display: flex;
    flex-direction: row;
    align-items: center;
`;
