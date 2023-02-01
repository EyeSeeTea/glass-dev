import React from "react";
import { DataSubmissionSteps } from "./DataSubmissionSteps";
import styled from "styled-components";
import { StatusDetails } from "./overview/StatusDetails";

interface CurrentDataSubmissionContentProps {
    moduleName: string;
    currentDataSubmissionStatus: StatusDetails;
}

export const CurrentDataSubmissionContent: React.FC<CurrentDataSubmissionContentProps> = ({
    moduleName,
    currentDataSubmissionStatus,
}) => {
    return (
        <ContentWrapper>
            <DataSubmissionSteps moduleName={moduleName} currentDataSubmissionStatus={currentDataSubmissionStatus} />
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
    p.intro {
        text-align: left;
        max-width: 730px;
        margin: 0 auto;
        font-weight: 300px;
        line-height: 1.4;
    }
`;
