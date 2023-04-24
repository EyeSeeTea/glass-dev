import React, { Dispatch, SetStateAction } from "react";
import { UploadSteps } from "./UploadSteps";
import styled from "styled-components";
import { StatusDetails } from "./overview/StatusDetails";
import { DataSubmissionStatusTypes } from "../../../domain/entities/GlassDataSubmission";

interface CurrentDataSubmissionContentProps {
    moduleName: string;
    currentDataSubmissionStatus: StatusDetails;
    setRefetchStatus: Dispatch<SetStateAction<DataSubmissionStatusTypes | undefined>>;
    step: number;
}

export const CurrentDataSubmissionContent: React.FC<CurrentDataSubmissionContentProps> = ({
    moduleName,
    currentDataSubmissionStatus,
    setRefetchStatus,
    step,
}) => {
    return (
        <ContentWrapper>
            <UploadSteps
                moduleName={moduleName}
                currentDataSubmissionStatus={currentDataSubmissionStatus}
                setRefetchStatus={setRefetchStatus}
                step={step}
            />
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
