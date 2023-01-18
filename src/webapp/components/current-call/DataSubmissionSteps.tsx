import React, { useState } from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { ListOfDatasets } from "./ListOfDatasets";
import { Questionnaires } from "./Questionnaires";
import { Advanced } from "./Advanced";
import { Validations } from "./Validations";
import { Overview } from "./overview/Overview";

interface DataSubmissionStepsProps {
    moduleId: string;
    currentPeriod: number;
}

export const DataSubmissionSteps: React.FC<DataSubmissionStepsProps> = ({ moduleId, currentPeriod }) => {
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
            {renderTypeContent(currentStep, moduleId, currentPeriod)}
        </ContentWrapper>
    );
};

const renderTypeContent = (step: number, moduleId: string, currentPeriod: number) => {
    switch (step) {
        case 0:
            // TODO: set module name inside page root content to avoid prop drilling
            return <Overview moduleId={moduleId} currentPeriod={currentPeriod} />;
        case 1:
            return <ListOfDatasets />;
        case 2:
            return <Questionnaires />;
        case 3:
            return <Validations />;
        case 4:
            return <Advanced />;
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
`;
