import { useEffect, useState } from "react";
import { LineListDetails } from "../../domain/entities/GlassModule";
import { useAppContext } from "../contexts/app-context";
import { useCurrentModuleContext } from "../contexts/current-module-context";

export function useDownloadAllData() {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const [downloadAllLoading, setDownloadAllLoading] = useState(false);
    const [moduleLineListings, setModuleLineListings] = useState<LineListDetails[]>();

    useEffect(() => {
        setDownloadAllLoading(true);
        compositionRoot.downloads.getDownloadButtonDetails(currentModuleAccess.moduleName).run(
            lineListDetails => {
                setModuleLineListings(lineListDetails);
                setDownloadAllLoading(false);
            },
            err => {
                console.debug(`Error occurred on fetching download button details : ${err}`);
                setDownloadAllLoading(false);
            }
        );
    }, [compositionRoot.downloads, currentModuleAccess.moduleName]);

    const downloadAllData = (lineList: LineListDetails) => {
        setDownloadAllLoading(true);
        compositionRoot.downloads.downloadAllData(lineList).run(
            file => {
                //download file automatically
                const downloadSimulateAnchor = document.createElement("a");
                downloadSimulateAnchor.href = URL.createObjectURL(file);
                downloadSimulateAnchor.download = `${lineList.name}.csv`;
                // simulate link click
                document.body.appendChild(downloadSimulateAnchor);
                downloadSimulateAnchor.click();
                setDownloadAllLoading(false);
            },
            error => {
                console.debug(`Error occurred on download all data : ${error}`);
                setDownloadAllLoading(false);
            }
        );
    };

    return { moduleLineListings, downloadAllData, downloadAllLoading };
}
