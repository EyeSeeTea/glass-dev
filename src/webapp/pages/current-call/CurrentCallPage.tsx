import { Box, Typography } from "@material-ui/core";
import { CircularProgress } from "material-ui";
import React from "react";
import { CurrentCallContent } from "../../components/current-call/CurrentCallContent";
import { CurrentCallHeader } from "../../components/current-call/CurrentCallHeader";
import { MainLayout } from "../../components/main-layout/MainLayout";
import { useAppContext } from "../../contexts/app-context";
import { useGlassModule } from "../../hooks/useGlassModule";

interface CurrentCallPageProps {
    moduleName: string;
}

export const CurrentCallPage: React.FC<CurrentCallPageProps> = React.memo(({ moduleName }) => {
    return (
        <MainLayout>
            <CurrentCallPageContent moduleName={moduleName} />
        </MainLayout>
    );
});

export const CurrentCallPageContent: React.FC<CurrentCallPageProps> = React.memo(({ moduleName }) => {
    const { compositionRoot } = useAppContext();

    const result = useGlassModule(compositionRoot, moduleName);

    switch (result.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{result.message}</Typography>;
        case "loaded":
            return (
                <React.Fragment>
                    <CurrentCallHeader module={result.data} />
                    <Box height={40} />
                    <CurrentCallContent />
                </React.Fragment>
            );
    }
});
