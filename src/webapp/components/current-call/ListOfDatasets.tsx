import React from "react";
import styled from "styled-components";
import { UploadsDataItemProps, UploadsTable } from "./UploadsTable";
import { useAppContext } from "../../contexts/app-context";
import { useGlassSubmissions } from "../../hooks/useGlassSubmissions";
import { CircularProgress, Typography } from "@material-ui/core";

function getUploadedItems(rows: UploadsDataItemProps[]) {
    return rows.filter(row => row.status.toLowerCase() === "uploaded");
}

function getNonUploadedItems(rows: UploadsDataItemProps[]) {
    return rows.filter(row => row.status.toLowerCase() !== "uploaded");
}

export const ListOfDatasets: React.FC = () => {
    const { compositionRoot } = useAppContext();

    const submissions = useGlassSubmissions(compositionRoot);

    switch (submissions.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{submissions.message}</Typography>;
        case "loaded":
            return (
                <ContentWrapper>
                    <UploadsTable
                        title="Correct Uploads"
                        items={getUploadedItems(submissions.data as UploadsDataItemProps[])}
                    />
                    <UploadsTable
                        title="Uploads with errors, or discarded"
                        items={getNonUploadedItems(submissions.data as UploadsDataItemProps[])}
                        className="error-group"
                    />
                </ContentWrapper>
            );
    }
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
`;
