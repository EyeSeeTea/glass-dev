import React from "react";
import styled from "styled-components";
import { UploadsDataItemProps, UploadsTable } from "./UploadsTable";
import { data } from "./mock-tables-data.json";

function getUploadedItems (rows: UploadsDataItemProps[]) {
    return rows.filter(row => row.status === "uploaded");
}

function getNonUploadedItems(rows: UploadsDataItemProps[]) {
    return rows.filter(row => row.status !== "uploaded");
}



export const ListOfDatasets: React.FC = () => {
    return (
        <ContentWrapper>
            <UploadsTable title="Correct Uploads" 
                items={getUploadedItems(data as UploadsDataItemProps[])} />
            <UploadsTable title="Uploads with errors, or discarded"
                items={getNonUploadedItems(data as UploadsDataItemProps[])} />
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
`;
