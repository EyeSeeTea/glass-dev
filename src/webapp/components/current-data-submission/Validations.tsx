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
import { DownloadType } from "../../../domain/utils/DownloadTemplate";

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
            setIsLoading(true);

            if (fileTypeState.kind === "loaded") {
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
                            const downloadSimulateAnchor = document.createElement("a");
                            downloadSimulateAnchor.href = URL.createObjectURL(file);
                            const fileTypeName = moduleProperties.get(currentModuleAccess.moduleName)
                                ?.isSingleFileTypePerSubmission
                                ? `-${fileTypeStateData || ""}`
                                : "";
                            downloadSimulateAnchor.download = `${currentModuleAccess.moduleName}${fileTypeName}-${downloadType}-${currentOrgUnitAccess.orgUnitCode}-Populated.xlsx`;
                            // simulate link click
                            document.body.appendChild(downloadSimulateAnchor);
                            downloadSimulateAnchor.click();
                            setIsLoading(false);
                        },
                        _error => {
                            snackbar.error(i18n.t("Error downloading data"));
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
            snackbar,
        ]
    );

    return (
        <>
            {lastSuccessfulAnalyticsRunTime.kind === "loaded" && (
                <Typography>
                    Last Successful Analytics Tables Update Time :
                    {new Date(lastSuccessfulAnalyticsRunTime.data).toUTCString()}. Any data submitted after this date
                    will not be reflected in these visualizations
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
                                    helperText="An excel file with all the calculated data in this dashboard"
                                    onClick={() => downloadTemplate("CALCULATED", fileTypeState.data)}
                                />
                                {fileTypeState.data === "PRODUCT" && (
                                    <DownloadButton
                                        title={
                                            moduleProperties.get(currentModuleAccess.moduleName)
                                                ?.calculatedSubstanceFileDownloadLabel || "Download calculated data"
                                        }
                                        helperText="An excel file with all the calculated substance data"
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
