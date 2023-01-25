import { Typography } from "@material-ui/core";
import { CircularProgress } from "material-ui";
import { useAppContext } from "../../contexts/app-context";
import { useGlassCallsByModule } from "../../hooks/useGlassCallsByModule";
import { CallsTable } from "./CallsTable";

export const CallsHistoryContent: React.FC = () => {
    const { compositionRoot } = useAppContext();

    const calls = useGlassCallsByModule(compositionRoot, "CVVp44xiXGJ");

    switch (calls.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{calls.message}</Typography>;
        case "loaded":
            return (
                <>
                    <CallsTable items={calls.data} />
                </>
            );
    }
};
