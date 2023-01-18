import React from "react";
import styled from "styled-components";
import { glassColors } from "../../../pages/app/themes/dhis2.theme";
import { CurrentStatus } from "./CurrentStatus";
import { statusMap } from "../StatusMap";
import { StatusDetails } from "./StatusDetails";
import { Typography } from "@material-ui/core";
import { CallStatusTypes } from "../../../../domain/entities/GlassCallStatus";

interface OverviewProps {
    moduleName: string;
    currentCallStatus: CallStatusTypes;
}

export const Overview: React.FC<OverviewProps> = ({ moduleName, currentCallStatus }) => {
    const currentStatusDetails: StatusDetails | undefined = statusMap.get(currentCallStatus);
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
};

const LinedBox = styled.div`
    margin: -15px;
    border: 1px solid ${glassColors.grey};
    padding: 20px 30px;
    border-radius: 15px;
`;
