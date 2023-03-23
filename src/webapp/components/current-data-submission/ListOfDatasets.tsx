import React from "react";
import styled from "styled-components";
import { UploadsTable } from "./UploadsTable";
import { GlassUploadsState } from "../../hooks/useGlassUploads";
import { ContentLoader } from "../content-loader/ContentLoader";
import { UploadsDataItem } from "../../entities/uploads";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { Button } from "@material-ui/core";
import { NavLink, useLocation } from "react-router-dom";
import { useStatusDataSubmission } from "../../hooks/useStatusDataSubmission";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { isEditModeStatus } from "../../utils/editModeStatus";
import { useGlassUploadsByModuleOUPeriod } from "../../hooks/useGlassUploadsByModuleOUPeriod";

function getUploadedItems(upload: GlassUploadsState) {
    if (upload.kind === "loaded") {
        return upload.data.filter(
            (row: UploadsDataItem) =>
                row.status.toLowerCase() === "uploaded" || row.status.toLowerCase() === "completed"
        );
    }
}

function getNonUploadedItems(upload: GlassUploadsState) {
    if (upload.kind === "loaded") {
        return upload.data.filter(
            (row: UploadsDataItem) =>
                row.status.toLowerCase() !== "uploaded" && row.status.toLowerCase() !== "completed"
        );
    }
}

export const ListOfDatasets: React.FC = () => {
    const location = useLocation();
    const queryParameters = new URLSearchParams(location.search);
    const periodFromUrl = parseInt(queryParameters.get("period") || "");
    const year = periodFromUrl || new Date().getFullYear() - 1;

    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const currentDataSubmissionStatus = useStatusDataSubmission(
        currentModuleAccess.moduleId,
        currentOrgUnitAccess.orgUnitId,
        year
    );
    const { uploads, refreshUploads } = useGlassUploadsByModuleOUPeriod(year.toString());

    return (
        <ContentLoader content={uploads}>
            <ContentWrapper>
                <UploadsTable
                    title={i18n.t("Correct Uploads")}
                    items={getUploadedItems(uploads)}
                    refreshUploads={refreshUploads}
                />
                <UploadsTable
                    title={i18n.t("Uploads with errors, or discarded")}
                    items={getNonUploadedItems(uploads)}
                    className="error-group"
                    refreshUploads={refreshUploads}
                />
                {currentDataSubmissionStatus.kind === "loaded" &&
                    isEditModeStatus(currentDataSubmissionStatus.data.title) && (
                        <div>
                            <Button variant="contained" color="primary" component={NavLink} to={`/upload`} exact={true}>
                                {i18n.t("Add new datasets")}
                            </Button>
                        </div>
                    )}
            </ContentWrapper>
        </ContentLoader>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
`;
