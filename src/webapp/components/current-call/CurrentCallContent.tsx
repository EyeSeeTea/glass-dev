import React from "react";
import { DataSubmissionSteps } from "./DataSubmissionSteps";
import styled from "styled-components";
import { StatusDetails } from "./overview/StatusDetails";

interface CurrentCallContentProps {
    moduleName: string;
    currentCallStatus: StatusDetails;
}

export const CurrentCallContent: React.FC<CurrentCallContentProps> = ({ moduleName, currentCallStatus }) => {
    return (
        <ContentWrapper>
            <DataSubmissionSteps moduleName={moduleName} currentCallStatus={currentCallStatus} />
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
