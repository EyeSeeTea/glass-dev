import React, { Dispatch, SetStateAction } from "react";
import { Box, Button, CircularProgress, DialogActions, DialogContent, Typography } from "@material-ui/core";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { DataSubmissionStatusTypes } from "../../../domain/entities/GlassDataSubmission";
import { ConfirmationDialog } from "@eyeseetea/d2-ui-components";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentDataSubmissionId } from "../../hooks/useCurrentDataSubmissionId";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { useCurrentUserGroupsAccess } from "../../hooks/useCurrentUserGroupsAccess";

interface SubmissionProps {
    setRefetchStatus: Dispatch<SetStateAction<DataSubmissionStatusTypes | undefined>>;
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}

export const Submission: React.FC<SubmissionProps> = ({ setRefetchStatus, setCurrentStep }) => {
    const { compositionRoot } = useAppContext();
    const [open, setOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);

    const showConfirmationDialog = () => {
        setOpen(true);
    };
    const hideConfirmationDialog = () => {
        setOpen(false);
    };

    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentPeriod } = useCurrentPeriodContext();

    const dataSubmissionId = useCurrentDataSubmissionId(
        currentModuleAccess.moduleId,
        currentModuleAccess.moduleName,
        currentOrgUnitAccess.orgUnitId,
        currentPeriod
    );

    const { approveAccessGroup, captureAccessGroup } = useCurrentUserGroupsAccess();

    const updateDataSubmissionStatus = () => {
        setIsLoading(true);
        compositionRoot.glassDataSubmission.setStatus(dataSubmissionId, "PENDING_APPROVAL").run(
            () => {
                //Triggerring reload of status in parent
                setRefetchStatus("PENDING_APPROVAL");

                if (captureAccessGroup.kind === "loaded" && approveAccessGroup.kind === "loaded") {
                    const approveAccessGroups = approveAccessGroup.data.map(aag => {
                        return aag.id;
                    });
                    const captureAccessGroups = captureAccessGroup.data.map(cag => {
                        return cag.id;
                    });

                    const userGroupsIds = [...approveAccessGroups, ...captureAccessGroups];
                    const notificationText = `The data submission for ${currentModuleAccess.moduleName} module for year ${currentPeriod} and country ${currentOrgUnitAccess.orgUnitName} has changed to WAITING WHO APROVAL`;
                    compositionRoot.notifications
                        .send(notificationText, notificationText, userGroupsIds, currentOrgUnitAccess.orgUnitPath)
                        .run(
                            () => {},
                            () => {}
                        );
                }
                setIsLoading(false);
                setOpen(false);
                setCurrentStep(0);
            },
            () => {
                setIsLoading(false);
                setOpen(false);
            }
        );
    };
    return (
        <ContentWrapper>
            <ConfirmationDialog
                isOpen={open}
                title={i18n.t("Confirm submission")}
                onSave={updateDataSubmissionStatus}
                onCancel={hideConfirmationDialog}
                saveText={i18n.t("Ok")}
                cancelText={i18n.t("Cancel")}
                fullWidth={true}
                disableEnforceFocus
            >
                <DialogContent>
                    <Typography>
                        {i18n.t(
                            "Please review that the submission package contains all the datasets that you want to include."
                        )}
                        {i18n.t(
                            "After you submit this package, you wont be able to edit it anymore without WHO permissions"
                        )}
                    </Typography>
                </DialogContent>
                <DialogActions>{isLoading && <CircularProgress size={25} />}</DialogActions>
            </ConfirmationDialog>
            <LinedBox>
                <Box sx={{ m: 2 }} />
                <div className="status-box">
                    <small>{i18n.t("Confirm submission")}</small>
                </div>
                <Box sx={{ m: 2 }} />
                <p>
                    {i18n.t(
                        "Please review that the submission package contains all the datasets that you want to include. After you submit this package, you wont be able to edit it anymore wihout WHO permissions"
                    )}
                </p>
                <Box sx={{ m: 2 }} />
                <Box sx={{ m: 2 }} />

                <ContentWrapper className="cta-buttons">
                    <Button variant="contained" color="primary" onClick={showConfirmationDialog}>
                        {i18n.t("Send Submission")}
                    </Button>
                </ContentWrapper>
            </LinedBox>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    h3,
    h4 {
        margin: 0;
    }
    p {
        margin: 0;
        line-height: 1.4;
    }
    .status-box {
        text-transform: uppercase;
        small {
            font-weight: bold;
            font-size: 13px;
            display: block;
            opacity: 0.7;
        }
        .status {
            font-weight: 500;
            &.not-completed {
                color: ${glassColors.orange};
            }
        }
    }
    .cta-buttons {
        display: flex;
        margin: 40px auto 0;
        justify-content: center;
        gap: 10%;
    }
`;

const LinedBox = styled.div`
    margin: -15px;
    border: 1px solid ${glassColors.grey};
    padding: 20px 30px;
    border-radius: 15px;
`;
