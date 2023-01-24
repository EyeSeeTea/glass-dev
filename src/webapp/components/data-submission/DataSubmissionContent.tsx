import React, { useState } from "react";
import { DataSubmissionNav } from "./DataSubmissionNav";
import { useDataSubmissionSteps } from "../../hooks/useDataSubmissionSteps";
import { ConsistencyChecks } from "./ConsistencyChecks";
import styled from "styled-components";
import { SupportButtons } from "./SupportButtons";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import { UploadFiles } from "./UploadFiles";
import { ReviewDataSummary } from "./ReviewDataSummary";
import { Completed } from "./Completed";



export const DataSubmissionContent: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    const changeStep = (step: number) => {
        setCurrentStep(step);
        if (!completedSteps.includes(step - 1)) {
            setCompletedSteps([...completedSteps, step - 1]);
        }
    };

    const steps = useDataSubmissionSteps();

    return (
        <ContentWrapper>
            <DataSubmissionNav
                steps={steps}
                currentStep={currentStep}
                changeStep={changeStep}
                completedSteps={completedSteps}
            />
            {steps.length &&
                renderStep(
                    currentStep,
                    changeStep
                )}
        </ContentWrapper>
    );
};

const renderStep = (step: number, changeStep: any) => {
    switch (step) {
        case 1:
            return <UploadFiles changeStep={changeStep} />;
        case 2:
            return <ReviewDataSummary changeStep={changeStep} />;
        case 4:
            return <Completed />;
        case 3:
            return (
                <>
                    <ConsistencyChecks changeStep={changeStep} />
                    <SupportButtons changeStep={changeStep} />
                </>
            );
        default:
            break;
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
    h3 {
        font-size: 21px;
        color: ${palette.text.primary};
    }
    .MuiTableContainer-root {
        border: none;
        box-shadow: none;
    }
    .MuiTableRow-head {
        border-bottom: 3px solid ${glassColors.greyLight};
        th {
            color: ${glassColors.grey};
            font-weight: 400;
            font-size: 15px;
        }
    }
    .MuiTableBody-root {
        tr {
            border: none;
            td {
                border-bottom: 1px solid ${glassColors.greyLight};
            }
            td:nth-child(1) {
                color: ${glassColors.red};
            }
            td:nth-child(3) {
                width: 40px;
                text-align: center;
                opacity: 0.4;
                &:hover {
                    opacity: 1;
                }
            }
        }
    }
`;
