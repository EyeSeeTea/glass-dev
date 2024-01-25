import React, { useCallback, useState } from "react";
import { EmbeddedReport } from "../reports/EmbeddedReport";
import { CircularProgress } from "material-ui";
import { useGlassDashboard } from "../../hooks/useGlassDashboard";
import { Typography } from "@material-ui/core";
import { useGetLastSuccessfulAnalyticsRunTime } from "../../hooks/useGetLastSuccessfulAnalyticsRunTime";
import { useAppContext } from "../../contexts/app-context";
import { useFileTypeByDataSubmission } from "../../hooks/useFileTypeByDataSubmission";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { FileType } from "../../../domain/usecases/data-entry/DownloadTemplateUseCase";
import moment from "moment";
import styled from "styled-components";
import { ContentLoader } from "../content-loader/ContentLoader";
import { DownloadButton } from "./DownloadButton";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useSnackbar } from "@eyeseetea/d2-ui-components";

export const Validations: React.FC = () => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();

    const { validationDashboardId } = useGlassDashboard();
    const { lastSuccessfulAnalyticsRunTime } = useGetLastSuccessfulAnalyticsRunTime();

    const [isLoading, setIsLoading] = useState(false);

    const fileTypeState = useFileTypeByDataSubmission();

    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentPeriod } = useCurrentPeriodContext();

    const downloadTemplate = useCallback(
        async (downloadType: "SUBMITTED" | "CALCULATED") => {
            setIsLoading(true);
            try {
                if (fileTypeState.kind === "loaded") {
                    const startDateOfPeriod = moment(currentPeriod).startOf("year");
                    const endDateOfPeriod = moment(currentPeriod).endOf("year");
                    const file = await compositionRoot.fileSubmission.downloadTemplate({
                        downloadType: downloadType,
                        fileType: fileTypeState.data as FileType,
                        moduleName: currentModuleAccess.moduleName,
                        orgUnit: currentOrgUnitAccess.orgUnitId,
                        populate: true,
                        populateStartDate: startDateOfPeriod,
                        populateEndDate: endDateOfPeriod,
                        downloadRelationships: true,
                        splitDataEntryTabsBySection: true,
                        useCodesForMetadata: true,
                    });

                    const downloadSimulateAnchor = document.createElement("a");
                    downloadSimulateAnchor.href = URL.createObjectURL(file);
                    const fileTypeName = moduleProperties.get(currentModuleAccess.moduleName)
                        ?.isSingleFileTypePerSubmission
                        ? `-${fileTypeState.data}-LEVEL-DATA`
                        : "";
                    downloadSimulateAnchor.download = `${currentModuleAccess.moduleName}${fileTypeName}-${currentOrgUnitAccess.orgUnitCode}-TEMPLATE.xlsx`;
                    // simulate link click
                    document.body.appendChild(downloadSimulateAnchor);
                    downloadSimulateAnchor.click();
                }
            } catch {
                snackbar.error(i18n.t("Error downloading data"));
            } finally {
                setIsLoading(false);
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
                <ContentLoader content={fileTypeState} extraLoading={isLoading}>
                    <DownloadButtonsWrapper>
                        <DownloadButton
                            title="Download submitted data"
                            helperText="An excel file with all the data in this dashboard"
                            onClick={() => downloadTemplate("SUBMITTED")}
                        />
                        <DownloadButton
                            title="Download calculated data"
                            helperText="An excel file with all the data in this dashboard"
                            onClick={() => downloadTemplate("CALCULATED")}
                        />
                    </DownloadButtonsWrapper>
                </ContentLoader>
            )}
            {validationDashboardId.kind === "loading" && <CircularProgress />}
            {validationDashboardId.kind === "loaded" && <EmbeddedReport dashboardId={validationDashboardId.data} />}
        </>
    );
};

const DownloadButtonsWrapper = styled.div`
    display: flex;
    gap: 30px;
    margin: 20px 0px;
`;
