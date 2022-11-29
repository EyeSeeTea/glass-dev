import React from "react";
import { CircularProgress, Grid, Typography } from "@material-ui/core";
import { DataSubmissionNav } from "./DataSubmissionNav";
import { useAppContext } from "../../contexts/app-context";
import { useDataSubmissionSteps } from "../../hooks/userDataSubmissionSteps";

export const DataSubmissionContent: React.FC = () => {
    const { compositionRoot } = useAppContext();

    const stepsResult = useDataSubmissionSteps(compositionRoot);

    console.log("stepsResult:", stepsResult);

    switch (stepsResult.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{stepsResult.message}</Typography>;
        case "loaded":
            // return <DataSubmissionNav steps={stepsResult.data} />;
            return <span>Steps loaded...</span>;
    }
};
