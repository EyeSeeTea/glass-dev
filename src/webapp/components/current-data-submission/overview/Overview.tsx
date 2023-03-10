import React from "react";
import styled from "styled-components";
import { glassColors } from "../../../pages/app/themes/dhis2.theme";
import { CurrentStatus } from "./CurrentStatus";
import { StatusDetails } from "./StatusDetails";
import { Typography } from "@material-ui/core";
import i18n from "@eyeseetea/d2-ui-components/locales";

interface OverviewProps {
    moduleName: string;
    currentDataSubmissionStatus: StatusDetails;
}

export const Overview: React.FC<OverviewProps> = ({ moduleName, currentDataSubmissionStatus }) => {
    return (
        <LinedBox>
            {currentDataSubmissionStatus ? (
                <CurrentStatus
                    moduleName={moduleName}
                    title={currentDataSubmissionStatus.title}
                    description={currentDataSubmissionStatus.description}
                    statusColor={currentDataSubmissionStatus.colour}
                    leftCTAs={currentDataSubmissionStatus.leftCTAs}
                    rightCTAs={currentDataSubmissionStatus.rightCTAs}
                    showUploadHistory={currentDataSubmissionStatus.showUploadHistory}
                    isActionRequired={currentDataSubmissionStatus.isActionRequired}
                />
            ) : (
                <Typography variant="h6">{i18n.t("Data Submission status has errors...")}</Typography>
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
