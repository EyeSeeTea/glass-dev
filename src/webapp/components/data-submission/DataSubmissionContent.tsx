import React, { useState } from "react";
import { CircularProgress, Typography } from "@material-ui/core";
import { DataSubmissionNav } from "./DataSubmissionNav";
import { useAppContext } from "../../contexts/app-context";
import { useDataSubmissionSteps } from "../../hooks/userDataSubmissionSteps";
import { ConsistencyChecks } from "./ConsistencyChecks";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { NonBlockingWarnings } from "./NonBlockingWarnings";
import { SupportButtons } from "./SupportButtons";

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
                    {stepsResult?.data[0]?.children?.length && (
                        currentStep === 3 ? 
                            (
                                <>
                                    <ConsistencyChecks />
                                    <NonBlockingWarnings />
                                    <SupportButtons />                                
                                </>
                            ) :
                            <p className="intro">
                                {i18n.t(stepsResult.data[0].children[currentStep - 1]?.content)}
                            </p>
                    )}
                </ContentWrapper>
            )
    }
};

const ContentWrapper = styled.div`
    p.intro {
        text-align: center;
        max-width: 730px;
        margin: 30px auto;
        font-weight: 300px;
        line-height: 1.4;
    }
`