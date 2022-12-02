import React, { useState } from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import { ListOfDatasets } from "./ListOfDatasets";
import { CurrentStatus } from "./CurrentStatus";

export const DataSubmissionSteps: React.FC = () => {
    const [currentStep, setCurrentStep] = useState<number>(0);

    return (
        <ContentWrapper>
            <div className="toggles">
                <Button onClick={() => setCurrentStep(0)} className={currentStep === 0 ? "current" : ""}>
                    Overview
                </Button>
                <Button onClick={() => setCurrentStep(1)} className={currentStep === 1 ? "current" : ""}>
                    List of Dates
                </Button>
                <Button onClick={() => setCurrentStep(2)} className={currentStep === 2 ? "current" : ""}>
                    Questionnaires
                </Button>
                <Button onClick={() => setCurrentStep(3)} className={currentStep === 3 ? "current" : ""}>
                    Validation
                </Button>
                <Button onClick={() => setCurrentStep(4)} className={currentStep === 4 ? "current" : ""}>
                    Advanced
                </Button>
            </div>
            {renderTypeContent(currentStep)}
        </ContentWrapper>
    );
};

const renderTypeContent = (step: number) => {
    switch (step) {
        case 0:
            return <CurrentStatus />;
        case 1:
            return <ListOfDatasets />;
        case 2:
            return <p>Questionnaire One...</p>;
        case 3:
            return <p>Validation...</p>;
        case 4:
            return <p>Advanced...</p>;
        default:
            return <p>No Data uploaded...</p>;
    }
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
    .toggles {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        button {
            color: ${glassColors.greyDisabled};
            padding: 10px 15px;
            border-radius: 0;
            border: none;
            flex: 1;
            border-bottom: 2px solid ${glassColors.greyLight};
            &.current {
                color: ${glassColors.mainPrimary};
                border-bottom: 4px solid ${glassColors.mainPrimary};
            }
        }
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
