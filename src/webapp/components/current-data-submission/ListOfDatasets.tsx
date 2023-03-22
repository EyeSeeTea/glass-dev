import React from "react";
import styled from "styled-components";
import { UploadsTable } from "./UploadsTable";
import { GlassUploadsState } from "../../hooks/useGlassUploads";
import { ContentLoader } from "../content-loader/ContentLoader";
import { UploadsDataItem } from "../../entities/uploads";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { Button } from "@material-ui/core";
import { NavLink } from "react-router-dom";
import { useGlassUploadsByModuleOUPeriod } from "../../hooks/useGlassUploadsByModuleOUPeriod";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";

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
    const { currentPeriod } = useCurrentPeriodContext();

    const { uploads, refreshUploads } = useGlassUploadsByModuleOUPeriod(currentPeriod.toString());

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
                <div>
                    <Button variant="contained" color="primary" component={NavLink} to={`/upload`} exact={true}>
                        {i18n.t("Add new datasets")}
                    </Button>
                </div>
            </ContentWrapper>
        </ContentLoader>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
`;
