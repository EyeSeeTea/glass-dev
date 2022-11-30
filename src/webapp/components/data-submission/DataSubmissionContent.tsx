import React, { useState } from "react";
import { CircularProgress, Grid, Typography } from "@material-ui/core";
import { DataSubmissionNav } from "./DataSubmissionNav";
import { useAppContext } from "../../contexts/app-context";
import { useDataSubmissionSteps } from "../../hooks/userDataSubmissionSteps";

export const DataSubmissionContent: React.FC = () => {
    const { compositionRoot } = useAppContext();
    const [currentStep, setCurrentStep] = useState(1);

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
                <React.Fragment>
                    <DataSubmissionNav
                        steps={stepsResult.data[0]?.children}
                        currentStep={currentStep}
                        changeStep={changeStep}
                    />
                    {stepsResult?.data[0]?.children?.length && (
                        <p>{stepsResult.data[0].children[currentStep - 1]?.content}</p>
                    )}
                </React.Fragment>
            );
    }
};
