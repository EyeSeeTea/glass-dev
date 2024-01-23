import { useAppContext } from "../contexts/app-context";
import { useCurrentModuleContext } from "../contexts/current-module-context";

export function useDownloadAllData() {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();

    const downloadAllData = () => {
        console.debug("clicked!");
    };

    return { downloadAllData };
}
