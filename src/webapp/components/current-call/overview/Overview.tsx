import React from "react";
import styled from "styled-components";
import { useAppContext } from "../../../contexts/app-context";
import { glassColors } from "../../../pages/app/themes/dhis2.theme";
import { CurrentStatus } from "./CurrentStatus";
import { statusMap } from "./StatusMap";
import { StatusDetails } from "./StatusTypes";
import { CircularProgress, Typography } from "@material-ui/core";
import { useSpecificCall } from "../../../hooks/useSpecificCall";

interface OverviewProps {
    moduleName: string;
}

export const Overview: React.FC<OverviewProps> = ({ moduleName }) => {
    const { compositionRoot } = useAppContext();

    //TO DO : Fetch actual values
    const currentCall = useSpecificCall(compositionRoot, "CVVp44xiXGJ", "DVnpk4xiXGJ", 2018);

    switch (currentCall.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{currentCall.message}</Typography>;
        case "loaded": {
            const currentStatusDetails: StatusDetails | undefined = statusMap.get(currentCall.data);
            return (
                <LinedBox>
                    {currentStatusDetails ? (
                        <CurrentStatus
                            moduleName={moduleName}
                            title={currentStatusDetails.title}
                            description={currentStatusDetails.description}
                            statusColor={currentStatusDetails.colour}
                            ctas={currentStatusDetails.cta}
                        />
                    ) : (
                        <Typography variant="h6">Call Submission status has errors...</Typography>
                    )}
                </LinedBox>
            );
        }
    }
};

const LinedBox = styled.div`
    margin: -15px;
    border: 1px solid ${glassColors.grey};
    padding: 20px 30px;
    border-radius: 15px;
`;
