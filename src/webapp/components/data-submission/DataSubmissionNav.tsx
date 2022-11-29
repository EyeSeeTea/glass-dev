import React from "react";
import { Box, Button, Typography } from "@material-ui/core";
import styled from "styled-components";
import { CustomCard } from "../custom-card/CustomCard";
import i18n from "../../../locales";
import { useDataSubmissionSteps } from "../../hooks/userDataSubmissionSteps";
import { useAppContext } from "../../contexts/app-context";
import { CircularProgress } from "material-ui";
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
}

export const DataSubmissionNav: React.FC<DataSubmissionNavProps> = ({ steps }) => {
    return (
        <NavContainer>
            {steps?.length && (
                <ul>
                    {steps.map(step => (
                        <li key={step.stepNumber}>
                            <Button>{step.title}</Button>
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
        flex-direction: row;
        gap: 20px;
        align-items: center;
        justify-content: center;
    }
`;
