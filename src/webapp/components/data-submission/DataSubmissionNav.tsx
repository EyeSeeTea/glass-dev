import React from "react";
import { Box, Button, Typography } from "@material-ui/core";
import styled from "styled-components";
import { CustomCard } from "../custom-card/CustomCard";
import i18n from "../../../locales";
import { useDataSubmissionSteps } from "../../hooks/userDataSubmissionSteps";
import { useAppContext } from "../../contexts/app-context";
import { CircularProgress } from "material-ui";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
export interface DataSubmissionStep {
    stepNumber: number;
    title: string;
    content?: any;
}
export interface DataSubmissionWizard {
    moduleName: string;
    children?: DataSubmissionStep[];
}

interface DataSubmissionNavProps {
    steps?: DataSubmissionStep[];
    currentStep: number;
    changeStep: (step: number) => void;
}

export const DataSubmissionNav: React.FC<DataSubmissionNavProps> = props => {
    const { steps, currentStep, changeStep } = props;

    return (
        <NavContainer>
            {steps?.length && (
                <ul>
                    {steps.map(step => (
                        <li key={step.stepNumber} className={currentStep === step.stepNumber ? "current" : ""}>
                            <div className="number">{step.stepNumber}</div>
                            <Button onClick={() => changeStep(step.stepNumber)}>{step.title}</Button>
                        </li>
                    ))}
                </ul>
            )}
        </NavContainer>
    );
};

const NavContainer = styled.div`
    ul {
        display: flex;
        margin: 0;
        flex-direction: row;
        gap: 20px;
        align-items: center;
        justify-content: center;
        list-style-type: none;
    }
    li {
        display: flex;
        gap: 10px;
        align-items: center;
        opacity: 0.5;
        &.current {
            opacity: 1;
        }
    }
    .number {
        background-color: ${glassColors.mainPrimary};
        color: white;
        border-radius: 100%;
        height: 20px;
        width: 20px;
        line-height: 20px;
        text-align: center;
        font-size: 12px;
        flex: none;
    }
    button {
        line-height: 1.4;
        text-align: left;
    }
`;
