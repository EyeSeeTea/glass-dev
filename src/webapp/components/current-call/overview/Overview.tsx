import React from "react";
import styled from "styled-components";
import { glassColors } from "../../../pages/app/themes/dhis2.theme";
import { CurrentStatus } from "./CurrentStatus";
import { StatusDetails } from "./StatusDetails";
import { Typography } from "@material-ui/core";
import i18n from "@eyeseetea/d2-ui-components/locales";

interface OverviewProps {
    moduleName: string;
    currentCallStatus: StatusDetails;
}

export const Overview: React.FC<OverviewProps> = ({ moduleName, currentCallStatus }) => {
    return (
        <LinedBox>
            {currentCallStatus ? (
                <CurrentStatus
                    moduleName={moduleName}
                    title={currentCallStatus.title}
                    description={currentCallStatus.description}
                    statusColor={currentCallStatus.colour}
                    ctas={currentCallStatus.cta}
                />
            ) : (
                <Typography variant="h6">{i18n.t("Call Submission status has errors...")}</Typography>
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
