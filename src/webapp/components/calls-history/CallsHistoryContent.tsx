import { Typography } from "@material-ui/core";
import { CircularProgress } from "material-ui";
import { useAppContext } from "../../contexts/app-context";
import { useGlassCallsByModule } from "../../hooks/useGlassCallsByModule";
import { CallsTable } from "./CallsTable";

interface CallsHistoryContentProps {
    moduleName: string;
    moduleId: string;
}

export const CallsHistoryContent: React.FC<CallsHistoryContentProps> = ({ moduleId, moduleName }) => {
    const { compositionRoot } = useAppContext();

    const calls = useGlassCallsByModule(compositionRoot, moduleId);

    switch (calls.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{calls.message}</Typography>;
        case "loaded":
            return (
                <>
                    <CallsTable items={calls.data} moduleName={moduleName} />
                </>
            );
    }
};
