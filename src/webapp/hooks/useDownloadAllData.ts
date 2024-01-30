import { useAppContext } from "../contexts/app-context";
import { useCurrentModuleContext } from "../contexts/current-module-context";
import { useCurrentPeriodContext } from "../contexts/current-period-context";

export function useDownloadAllData() {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentPeriod } = useCurrentPeriodContext();

    const downloadAllData = () => {
        compositionRoot.downloads.downloadAllData(currentModuleAccess.moduleName).run(
            file => {
                //download file automatically
                const downloadSimulateAnchor = document.createElement("a");
                downloadSimulateAnchor.href = URL.createObjectURL(file);
                downloadSimulateAnchor.download = `${currentModuleAccess.moduleName}-${currentPeriod}-All-Data.csv`;
                // simulate link click
                document.body.appendChild(downloadSimulateAnchor);
                downloadSimulateAnchor.click();
            },
            () => {}
        );
    };

    return { downloadAllData };
}
