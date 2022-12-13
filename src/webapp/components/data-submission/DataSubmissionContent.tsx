import React, { useState } from "react";
import { CircularProgress, Typography } from "@material-ui/core";
import { DataSubmissionNav } from "./DataSubmissionNav";
import { useAppContext } from "../../contexts/app-context";
import { useDataSubmissionSteps } from "../../hooks/useDataSubmissionSteps";
import { ConsistencyChecks } from "./ConsistencyChecks";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { SupportButtons } from "./SupportButtons";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";

export const DataSubmissionContent: React.FC = () => {
    const { compositionRoot } = useAppContext();
    const [currentStep, setCurrentStep] = useState(3);

    const changeStep = (step: number) => {
        setCurrentStep(step);
    };

    const stepsResult = useDataSubmissionSteps(compositionRoot);

    switch (stepsResult.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{stepsResult.message}</Typography>;
        case "loaded":
            return (
                <ContentWrapper>
                    <DataSubmissionNav
                        steps={stepsResult.data[0]?.children}
                        currentStep={currentStep}
                        changeStep={changeStep}
                    />
                    {stepsResult?.data[0]?.children?.length &&
                        (currentStep === 3 ? (
                            <>
                                <ConsistencyChecks />
                                <SupportButtons />
                            </>
                        ) : (
                            <p className="intro">{i18n.t(stepsResult.data[0].children[currentStep - 1]?.content)}</p>
                        ))}
                </ContentWrapper>
            );
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
