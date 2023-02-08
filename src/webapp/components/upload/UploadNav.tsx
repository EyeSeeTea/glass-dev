import React from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import i18n from "@eyeseetea/d2-ui-components/locales";
export interface UploadStep {
    stepNumber: number;
    title: string;
    content?: any;
}
export interface UploadWizard {
    moduleName: string;
    moduleColor: string;
    children?: UploadStep[];
}

interface UploadNavProps {
    steps?: UploadStep[];
    currentStep: number;
    completedSteps: number[];
    changeStep: (step: number) => void;
}

export const UploadNav: React.FC<UploadNavProps> = props => {
    const { steps, currentStep, changeStep, completedSteps } = props;

    return (
        <NavContainer>
            {steps?.length && (
                <ul>
                    {steps.map(step => (
                        <li
                            key={step.stepNumber}
                            className={`${currentStep === step.stepNumber ? "current" : ""} ${
                                completedSteps.includes(step.stepNumber) ? "completed" : "incomplete"
                            }`}
                        >
                            <div className="number">{step.stepNumber}</div>
                            <Button onClick={() => changeStep(step.stepNumber)}>{i18n.t(step.title)}</Button>
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
        opacity: 0.4;
        &.current,
        &.completed {
            opacity: 1;
        }
        &:not(.current).incomplete {
            pointer-events: none;
            cursor: default;
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
