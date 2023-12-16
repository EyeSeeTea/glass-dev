import React, { useEffect } from "react";
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
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";
import { StatusHistoryType } from "../../../../domain/entities/GlassDataSubmission";
import dayjs from "dayjs";
import { useCurrentPeriodContext } from "../../../contexts/current-period-context";
import { moduleProperties } from "../../../../domain/utils/ModuleProperties";

export interface CtaButtonsProps {
    ctas: CTAs[];
    position?: "right";
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}

export const CtaButtons: React.FC<CtaButtonsProps> = ({ ctas, position, setCurrentStep }) => {
    const { compositionRoot, currentUser } = useAppContext();
    const snackbar = useSnackbar();
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess();

    const [statusHistory, setStatusHistory] = React.useState<StatusHistoryType[]>([]);
    const [isStatusHistoryDialogOpen, setIsStatusHistoryDialogOpen] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);

    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentPeriod } = useCurrentPeriodContext();

    useEffect(() => {
        setIsLoading(true);
        const isQuarterlyModule = currentUser.quarterlyPeriodModules.find(m => m.id === currentModuleAccess.moduleId)
            ? true
            : false;
        compositionRoot.glassDataSubmission
            .getSpecificDataSubmission(
                currentModuleAccess.moduleId,
                currentModuleAccess.moduleName,
                currentOrgUnitAccess.orgUnitId,
                currentPeriod,
                isQuarterlyModule
            )
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
        currentModuleAccess.moduleName,
        currentOrgUnitAccess.orgUnitId,
        currentPeriod,
        snackbar,
        currentUser.quarterlyPeriodModules,
    ]);

    const getCTAButton = (cta: CTAs, setCurrentStep: React.Dispatch<React.SetStateAction<number>>) => {
        // TODO : Button click event handlers to be added as corresponding feature developed.
        switch (cta.label) {
            case "Go to questionnaires":
                if (moduleProperties.get(currentModuleAccess.moduleName)?.isQuestionnaireReq)
                    return (
                        <Button
                            key={cta.key}
                            variant={cta.variant || "contained"}
                            color={cta.color || "primary"}
                            onClick={() => setCurrentStep(1)}
                            style={{ textTransform: "uppercase", marginRight: "10px" }}
                        >
                            {i18n.t("Go to questionnaires")}
                        </Button>
                    );
                else return <></>;

            case "Upload/Delete datasets":
                return (
                    <Button
                        key={cta.key}
                        variant={cta.variant || "contained"}
                        color={cta.color || "primary"}
                        onClick={() => setCurrentStep(2)}
                        disabled={!hasCurrentUserCaptureAccess}
                        style={{ textTransform: "uppercase", marginRight: "10px" }}
                    >
                        {i18n.t("Upload/Delete datasets")}
                    </Button>
                );

            case "Go to submission":
                return (
                    <Button
                        key={cta.key}
                        variant={cta.variant || "contained"}
                        color={cta.color || "primary"}
                        onClick={() => setCurrentStep(5)}
                        disabled={!hasCurrentUserCaptureAccess}
                        style={{ textTransform: "uppercase", marginRight: "10px" }}
                    >
                        {i18n.t("Go to submission")}
                    </Button>
                );

            case "Review submitted datasets":
                return (
                    <Button
                        key={cta.key}
                        variant={cta.variant}
                        color={cta.color}
                        onClick={() => setCurrentStep(2)}
                        style={{ textTransform: "uppercase" }}
                    >
                        {i18n.t(`${cta.label}`)}
                    </Button>
                );
            case "Request data update":
                return (
                    <Button
                        key={cta.key}
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
                        key={cta.key}
                        onClick={() => setIsStatusHistoryDialogOpen(true)}
                        style={{ textTransform: "uppercase" }}
                    >
                        {i18n.t(`${cta.label}`)}
                    </Button>
                );
            default:
                return (
                    <Button
                        key={cta.key}
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
