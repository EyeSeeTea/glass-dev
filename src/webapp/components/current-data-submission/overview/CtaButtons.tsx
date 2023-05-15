import React, { Dispatch, SetStateAction, useEffect } from "react";
import {
    Button,
    Chip,
    CircularProgress,
    DialogActions,
    DialogContent,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@material-ui/core";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { NavLink } from "react-router-dom";
import { CTAs } from "./StatusDetails";
import { useGlassCaptureAccess } from "../../../hooks/useGlassCaptureAccess";
import { ConfirmationDialog, useSnackbar } from "@eyeseetea/d2-ui-components";
import { useAppContext } from "../../../contexts/app-context";
import { useCurrentDataSubmissionId } from "../../../hooks/useCurrentDataSubmissionId";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";
import { DataSubmissionStatusTypes, StatusHistoryType } from "../../../../domain/entities/GlassDataSubmission";
import dayjs from "dayjs";
import { useCurrentPeriodContext } from "../../../contexts/current-period-context";
import { useCurrentUserGroupsAccess } from "../../../hooks/useCurrentUserGroupsAccess";

export interface CtaButtonsProps {
    ctas: CTAs[];
    position?: "right";
    setRefetchStatus: Dispatch<SetStateAction<DataSubmissionStatusTypes | undefined>>;
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}

export const CtaButtons: React.FC<CtaButtonsProps> = ({ ctas, position, setRefetchStatus, setCurrentStep }) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess();
    const [open, setOpen] = React.useState(false);
    const [statusHistory, setStatusHistory] = React.useState<StatusHistoryType[]>([]);
    const [isStatusHistoryDialogOpen, setIsStatusHistoryDialogOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);

    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentPeriod } = useCurrentPeriodContext();

    const dataSubmissionId = useCurrentDataSubmissionId(
        compositionRoot,
        currentModuleAccess.moduleId,
        currentOrgUnitAccess.orgUnitId,
        currentPeriod
    );

    const { approveAccessGroup, captureAccessGroup } = useCurrentUserGroupsAccess();

    useEffect(() => {
        setIsLoading(true);
        compositionRoot.glassDataSubmission
            .getSpecificDataSubmission(currentModuleAccess.moduleId, currentOrgUnitAccess.orgUnitId, currentPeriod)
            .run(
                dataSubmission => {
                    setStatusHistory(dataSubmission.statusHistory);
                    setIsLoading(false);
                },
                () => {
                    snackbar.error("Error fetching full status history");
                    setIsLoading(false);
                }
            );
    }, [
        compositionRoot.glassDataSubmission,
        currentModuleAccess.moduleId,
        currentOrgUnitAccess.orgUnitId,
        currentPeriod,
        snackbar,
    ]);

    const showConfirmationDialog = () => {
        setOpen(true);
    };
    const hideConfirmationDialog = () => {
        setOpen(false);
    };
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
                        .send(notificationText, notificationText, userGroupsIds, [currentOrgUnitAccess.orgUnitId])
                        .run(
                            () => {},
                            () => {}
                        );
                }
                setIsLoading(false);
                setOpen(false);
            },
            () => {
                setIsLoading(false);
                setOpen(false);
            }
        );
    };

    const getCTAButton = (cta: CTAs, setCurrentStep: React.Dispatch<React.SetStateAction<number>>) => {
        // TODO : Button click event handlers to be added as corresponding feature developed.
        switch (cta.label) {
            case "Go to questionnaires":
                return (
                    <Button
                        key={cta.label}
                        variant={cta.variant || "contained"}
                        color={cta.color || "primary"}
                        onClick={() => setCurrentStep(2)}
                        style={{ textTransform: "uppercase" }}
                    >
                        {i18n.t("Go to questionnaires")}
                    </Button>
                );

            case "Upload/Delete datasets":
                return (
                    <Button
                        key={cta.label}
                        variant={cta.variant || "contained"}
                        color={cta.color || "primary"}
                        onClick={() => setCurrentStep(1)}
                        disabled={!hasCurrentUserCaptureAccess}
                        style={{ textTransform: "uppercase", marginRight: "20px" }}
                    >
                        {i18n.t("Upload/Delete datasets")}
                    </Button>
                );

            case "Send submission":
                return (
                    <Button key={cta.label} variant="contained" color="primary" onClick={showConfirmationDialog}>
                        {i18n.t("Send submission")}
                    </Button>
                );
            case "Review submitted datasets":
                return (
                    <Button
                        key={cta.label}
                        variant={cta.variant}
                        color={cta.color}
                        onClick={() => setCurrentStep(1)}
                        style={{ textTransform: "uppercase" }}
                    >
                        {i18n.t(`${cta.label}`)}
                    </Button>
                );
            case "Request data update":
                return (
                    <Button
                        key={cta.label}
                        variant={cta.variant}
                        color={cta.color}
                        onClick={() => setCurrentStep(4)}
                        style={{ textTransform: "uppercase" }}
                    >
                        {i18n.t(`${cta.label}`)}
                    </Button>
                );
            case "Display full status history":
                return (
                    <Button
                        variant={cta.variant}
                        color={cta.color}
                        key={cta.label}
                        onClick={() => setIsStatusHistoryDialogOpen(true)}
                        style={{ textTransform: "uppercase" }}
                    >
                        {i18n.t(`${cta.label}`)}
                    </Button>
                );
            default:
                return (
                    <Button
                        key={cta.label}
                        variant={cta.variant || "contained"}
                        color={cta.color || "primary"}
                        component={NavLink}
                        to={cta.url}
                        style={{ textTransform: "uppercase", marginRight: `${position ? "0" : "20px"}` }}
                    >
                        {i18n.t(`${cta.label}`)}
                    </Button>
                );
        }
    };

    return (
        <>
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
                            "After you submit this package, you wont be able to edit it anymore wihout WHO permissions"
                        )}
                    </Typography>
                </DialogContent>
                <DialogActions>{isLoading && <CircularProgress size={25} />}</DialogActions>
            </ConfirmationDialog>
            <ConfirmationDialog
                isOpen={isStatusHistoryDialogOpen}
                title={i18n.t("Full Status History")}
                onCancel={() => setIsStatusHistoryDialogOpen(false)}
                cancelText={i18n.t("Done")}
                disableEnforceFocus
                maxWidth="md"
                fullWidth
            >
                <DialogContent>
                    {statusHistory.map((status, i) => {
                        return (
                            <Typography key={i} display="inline">
                                <Chip
                                    label={status.to}
                                    color="primary"
                                    size="small"
                                    variant={i === statusHistory.length - 1 ? "default" : "outlined"}
                                />{" "}
                                {i < statusHistory.length - 1 && " >"}{" "}
                            </Typography>
                        );
                    })}
                    <TableContainer>
                        <Table component={Paper}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{i18n.t("From")}</TableCell>
                                    <TableCell>{i18n.t("To")}</TableCell>
                                    <TableCell>{i18n.t("Changed at")}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {statusHistory.map(row => (
                                    <TableRow key={row.to}>
                                        <TableCell component="th" scope="row">
                                            {row.from || "-"}
                                        </TableCell>
                                        <TableCell>{row.to}</TableCell>
                                        <TableCell>{dayjs(row.changedAt).format("DD-MM-YYYY h:mma")}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>{isLoading && <CircularProgress size={25} />}</DialogActions>
            </ConfirmationDialog>
            <>
                {ctas.map(cta => {
                    return getCTAButton(cta, setCurrentStep);
                })}
            </>
        </>
    );
};
