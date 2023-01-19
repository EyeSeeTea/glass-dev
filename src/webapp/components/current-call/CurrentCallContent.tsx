import React from "react";
import { CircularProgress, Typography } from "@material-ui/core";
import { useAppContext } from "../../contexts/app-context";
import { useDataSubmissionSteps } from "../../hooks/useDataSubmissionSteps";
import { DataSubmissionSteps } from "./DataSubmissionSteps";
import styled from "styled-components";

export interface CurrentCallContentProps {
    moduleName: string;
}

export const CurrentCallContent: React.FC<CurrentCallContentProps> = ({ moduleName }) => {
    const { compositionRoot } = useAppContext();

    const stepsResult = useDataSubmissionSteps(compositionRoot);

    switch (stepsResult.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{stepsResult.message}</Typography>;
        case "loaded":
            return (
                <ContentWrapper>
                    <DataSubmissionSteps moduleName={moduleName} />
                </ContentWrapper>
            );
    }
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
