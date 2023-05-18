import React, { Dispatch, SetStateAction } from "react";
import styled from "styled-components";
import { glassColors } from "../../../pages/app/themes/dhis2.theme";
import { CurrentStatus } from "./CurrentStatus";
import { StatusDetails } from "./StatusDetails";
import { Typography } from "@material-ui/core";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { DataSubmissionStatusTypes } from "../../../../domain/entities/GlassDataSubmission";

interface OverviewProps {
    moduleName: string;
    currentDataSubmissionStatus: StatusDetails;
    setRefetchStatus: Dispatch<SetStateAction<DataSubmissionStatusTypes | undefined>>;
    setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}

export const Overview: React.FC<OverviewProps> = ({ moduleName, currentDataSubmissionStatus, setCurrentStep }) => {
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
                    setCurrentStep={setCurrentStep}
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
