import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { glassColors } from "../../../pages/app/themes/dhis2.theme";
import { CurrentStatus } from "./CurrentStatus";
import { statusMap } from "./StatusMap";
import { Status, StatusDetails } from "./StatusTypes";

interface OverviewProps {
    moduleName: string;
}

export const Overview: React.FC<OverviewProps> = ({ moduleName }) => {
    const [currentStatus, setCurrentStatus] = useState<Status>("NOT_COMPLETED");
    const currentStatusDetails: StatusDetails | undefined = statusMap.get(currentStatus);

    useEffect(() => {
        //TO DO : fetch from datastore API;
        setCurrentStatus("REJECTED");
    }, [setCurrentStatus]);

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
                <p>Uploaded file has errors...</p>
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
