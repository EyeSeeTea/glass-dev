import React, { useCallback, useState } from "react";
import { useAppContext } from "../../contexts/app-context";
import { useFileTypeByDataSubmission } from "../../hooks/useFileTypeByDataSubmission";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import styled from "styled-components";
import { ContentLoader } from "../content-loader/ContentLoader";
import { DownloadButton } from "./DownloadButton";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { DownloadingBackdrop } from "../loading/DownloadingBackdrop";
import { useGlassDashboard } from "../../hooks/useGlassDashboard";
import { useGetLastSuccessfulAnalyticsRunTime } from "../../hooks/useGetLastSuccessfulAnalyticsRunTime";
import { CircularProgress, Typography } from "@material-ui/core";
import { MultiDashboardContent } from "../reports/MultiDashboardContent";
import { EmbeddedReport } from "../reports/EmbeddedReport";
import { DownloadType, NO_CALCULATED_DATA_AVAILABLE } from "../../../domain/utils/DownloadTemplate";

function formatAnalyticsDate(date: Date): string {
    return date.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export const Validations: React.FC = () => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();

    const { validationDashboardId } = useGlassDashboard();

    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentPeriod } = useCurrentPeriodContext();

    const { lastSuccessfulAnalyticsRunTime } = useGetLastSuccessfulAnalyticsRunTime();

    const [isLoading, setIsLoading] = useState(false);

    const fileTypeState = useFileTypeByDataSubmission();

    const downloadTemplate = useCallback(
        (downloadType: DownloadType, fileTypeStateData?: string) => {
            if (fileTypeState.kind === "loaded") {
                setIsLoading(true);
                compositionRoot.fileSubmission
                    .downloadPopulatedTemplate(
                        currentModuleAccess.moduleName,
                        currentOrgUnitAccess.orgUnitId,
                        currentPeriod,
                        fileTypeStateData ?? "",
                        downloadType
                    )
                    .run(
                        file => {
                            try {
                                let blob: Blob;
                                if (typeof Blob !== "undefined" && file instanceof Blob) {
                                    blob = file;
                                } else if (file) {
                                    blob = new Blob([file], {
                                        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                    });
                                } else {
                                    console.error("[DownloadPopulatedTemplate] no file received from use case");
                                    snackbar.error(i18n.t("Error downloading data"));
                                    setIsLoading(false);
                                    return;
                                }

                                const downloadSimulateAnchor = document.createElement("a");
                                downloadSimulateAnchor.id = "download-file";
                                downloadSimulateAnchor.href = URL.createObjectURL(blob);
                                const fileTypeName = moduleProperties.get(currentModuleAccess.moduleName)
                                    ?.isSingleFileTypePerSubmission
                                    ? `-${fileTypeStateData || ""}`
                                    : "";
                                downloadSimulateAnchor.download = `${currentModuleAccess.moduleName}${fileTypeName}-${downloadType}-${currentOrgUnitAccess.orgUnitCode}-Populated.xlsx`;
                                downloadSimulateAnchor.style.display = "none";
                                document.body.appendChild(downloadSimulateAnchor);
                                try {
                                    downloadSimulateAnchor.click();
                                } catch (err) {
                                    console.error("[DownloadPopulatedTemplate] error clicking download anchor", err);
                                    snackbar.error(i18n.t("Error downloading data"));
                                }
                                setTimeout(() => {
                                    URL.revokeObjectURL(downloadSimulateAnchor.href);
                                    if (downloadSimulateAnchor.parentNode) {
                                        downloadSimulateAnchor.parentNode.removeChild(downloadSimulateAnchor);
                                    }
                                }, 1000);
                                setIsLoading(false);
                            } catch (err) {
                                console.error("[DownloadPopulatedTemplate] unexpected error", err);
                                snackbar.error(i18n.t("Error downloading data"));
                                setIsLoading(false);
                            }
                        },
                        error => {
                            if (error === NO_CALCULATED_DATA_AVAILABLE) {
                                const dateStr =
                                    lastSuccessfulAnalyticsRunTime.kind === "loaded"
                                        ? formatAnalyticsDate(lastSuccessfulAnalyticsRunTime.data)
                                        : null;
                                snackbar.warning(
                                    dateStr
                                        ? `No calculated data found for this period. If you submitted data recently, it may take up to 24 hours to appear (last update: ${dateStr}). Please try again later or contact your administrator.`
                                        : "No calculated data found for this period. If you submitted data recently, it may take up to 24 hours to appear. Please try again later or contact your administrator."
                                );
                            } else {
                                console.error("[DownloadPopulatedTemplate] use case failed", error);
                                snackbar.error(i18n.t("Error downloading data"));
                            }
                            setIsLoading(false);
                        }
                    );
            }
        },
        [
            compositionRoot.fileSubmission,
            currentModuleAccess.moduleName,
            currentOrgUnitAccess.orgUnitCode,
            currentOrgUnitAccess.orgUnitId,
            currentPeriod,
            fileTypeState,
            lastSuccessfulAnalyticsRunTime,
            snackbar,
        ]
    );

    return (
        <>
            {lastSuccessfulAnalyticsRunTime.kind === "loaded" && (
                <Typography>
                    {`Data last updated: ${formatAnalyticsDate(lastSuccessfulAnalyticsRunTime.data)}. Any data submitted after this date may not yet be reflected in the visualisations or downloads below.`}
                </Typography>
            )}
            {moduleProperties.get(currentModuleAccess.moduleName)?.isDownloadDataAllowed && (
                <>
                    <ContentLoader content={fileTypeState}>
                        {fileTypeState.kind === "loaded" && fileTypeState.data && (
                            <DownloadButtonsWrapper>
                                <DownloadButton
                                    title={
                                        moduleProperties.get(currentModuleAccess.moduleName)?.submittedDownloadLabel ||
                                        "Download submitted data"
                                    }
                                    helperText="An excel file with all the submitted data in this dashboard"
                                    onClick={() => downloadTemplate("SUBMITTED", fileTypeState.data)}
                                />
                                <DownloadButton
                                    title={
                                        (fileTypeState.data === "PRODUCT"
                                            ? moduleProperties.get(currentModuleAccess.moduleName)
                                                  ?.calculatedProductDownloadLabel
                                            : moduleProperties.get(currentModuleAccess.moduleName)
                                                  ?.calculatedSubstanceFileDownloadLabel) || "Download calculated data"
                                    }
                                    helperText={
                                        lastSuccessfulAnalyticsRunTime.kind === "loaded"
                                            ? `Contains data submitted before ${formatAnalyticsDate(lastSuccessfulAnalyticsRunTime.data)}`
                                            : "An excel file with all the calculated data in this dashboard"
                                    }
                                    onClick={() => downloadTemplate("CALCULATED", fileTypeState.data)}
                                />
                                {fileTypeState.data === "PRODUCT" && (
                                    <DownloadButton
                                        title={
                                            moduleProperties.get(currentModuleAccess.moduleName)
                                                ?.calculatedSubstanceFileDownloadLabel || "Download calculated data"
                                        }
                                        helperText={
                                            lastSuccessfulAnalyticsRunTime.kind === "loaded"
                                                ? `Contains data submitted before ${formatAnalyticsDate(lastSuccessfulAnalyticsRunTime.data)}`
                                                : "An excel file with all the calculated substance data"
                                        }
                                        onClick={() => downloadTemplate("CALCULATED", "SUBSTANCE")}
                                        disabled={!fileTypeState.data}
                                    />
                                )}
                            </DownloadButtonsWrapper>
                        )}
                    </ContentLoader>
                </>
            )}
            {moduleProperties.get(currentModuleAccess.moduleName)?.isMultiDashboard ? (
                <MultiDashboardContent type="Validation" />
            ) : (
                <>
                    {validationDashboardId.kind === "loading" && <CircularProgress />}
                    {validationDashboardId.kind === "loaded" && (
                        <EmbeddedReport dashboardId={validationDashboardId.data} />
                    )}
                </>
            )}
            <DownloadingBackdrop isOpen={isLoading} />
        </>
    );
};

const DownloadButtonsWrapper = styled.div`
    display: flex;
    gap: 30px;
    margin: 20px 0px;
`;
