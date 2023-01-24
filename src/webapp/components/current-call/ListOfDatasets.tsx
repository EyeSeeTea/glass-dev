import React from "react";
import styled from "styled-components";
import { UploadsTable } from "./UploadsTable";
import { useAppContext } from "../../contexts/app-context";
import { GlassSubmissionsState, useGlassSubmissions } from "../../hooks/useGlassSubmissions";
import { ContentLoader } from "../content-loader/ContentLoader";
import { UploadsDataItem } from "../../entities/uploads";

function getUploadedItems(submission: GlassSubmissionsState) {
    if (submission.kind === "loaded") {
        return submission.data.filter((row: UploadsDataItem) => row.status.toLowerCase() === "uploaded");
    }
}

function getNonUploadedItems(submission: GlassSubmissionsState) {
    if (submission.kind === "loaded") {
        return submission.data.filter((row: UploadsDataItem) => row.status.toLowerCase() !== "uploaded");
    }
}

export const ListOfDatasets: React.FC = () => {
    const { compositionRoot } = useAppContext();

    const submissions = useGlassSubmissions(compositionRoot);

    return (
        <ContentLoader content={submissions}>
            <ContentWrapper>
                <h3>ContentLoader content</h3>
                
                <UploadsTable title="Correct Uploads" items={getUploadedItems(submissions)} />
                
                <UploadsTable
                    title="Uploads with errors, or discarded"
                    items={getNonUploadedItems(submissions)}
                    className="error-group"
                />
                
            </ContentWrapper>
        </ContentLoader>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
`;
