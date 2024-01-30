import { useAppContext } from "../contexts/app-context";
import { useCurrentModuleContext } from "../contexts/current-module-context";

export function useDownloadAllData() {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();

    const downloadAllData = () => {
        compositionRoot.downloads.downloadAllData(currentModuleAccess.moduleName).run(
            file => {
                //download file automatically
                const downloadSimulateAnchor = document.createElement("a");
                downloadSimulateAnchor.href = URL.createObjectURL(file);
                downloadSimulateAnchor.download = `${currentModuleAccess.moduleName}-GLASS-Data.csv`;
                // simulate link click
                document.body.appendChild(downloadSimulateAnchor);
                downloadSimulateAnchor.click();
            },
            error => {
                console.debug(`Error occurred on download all data : ${error}`);
            }
        );
    };

    return { downloadAllData };
}
