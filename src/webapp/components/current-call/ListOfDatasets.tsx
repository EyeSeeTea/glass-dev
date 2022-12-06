import React from "react";
import styled from "styled-components";
import { UploadsTable } from "./UploadsTable";

export const ListOfDatasets: React.FC = () => {
    return (
        <ContentWrapper>
            <UploadsTable title="Correct Uploads" />
            <UploadsTable title="Uploads with errors, or discarded" />
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 30px;
`;
