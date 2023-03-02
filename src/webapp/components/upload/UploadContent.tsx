import React, { useState } from "react";
import { UploadNav } from "./UploadNav";
import { useUploadSteps } from "../../hooks/useUploadSteps";
import { ConsistencyChecks } from "./ConsistencyChecks";
import styled from "styled-components";
import { SupportButtons } from "./SupportButtons";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import { UploadFiles } from "./UploadFiles";
import { ReviewDataSummary } from "./ReviewDataSummary";
import { Completed } from "./Completed";

export const UploadContent: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [risFile, setRisFile] = useState<File | null>(null);
    const [sampleFile, setSampleFile] = useState<File | null>(null);

    const changeStep = (step: number) => {
        setCurrentStep(step);
        if (!completedSteps.includes(step - 1)) {
            setCompletedSteps([...completedSteps, step - 1]);
        }
    };

    const steps = useUploadSteps();

    return (
        <ContentWrapper>
            <UploadNav
                steps={steps}
                currentStep={currentStep}
                changeStep={changeStep}
                completedSteps={completedSteps}
            />
            {steps.length && renderStep(currentStep, changeStep, risFile, setRisFile, sampleFile, setSampleFile)}
        </ContentWrapper>
    );
};

const renderStep = (
    step: number,
    changeStep: any,
    risFile: File | null,
    setRisFile: React.Dispatch<React.SetStateAction<File | null>>,
    sampleFile: File | null,
    setSampleFile: React.Dispatch<React.SetStateAction<File | null>>
) => {
    switch (step) {
        case 1:
            return (
                <UploadFiles
                    changeStep={changeStep}
                    risFile={risFile}
                    setRisFile={setRisFile}
                    sampleFile={sampleFile}
                    setSampleFile={setSampleFile}
                />
            );
        case 2:
            return (
                <>
                    <ConsistencyChecks changeStep={changeStep} risFile={risFile} sampleFile={sampleFile} />
                    <SupportButtons changeStep={changeStep} />
                </>
            );
        case 3:
            return <ReviewDataSummary changeStep={changeStep} />;
        case 4:
            return <Completed />;
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
