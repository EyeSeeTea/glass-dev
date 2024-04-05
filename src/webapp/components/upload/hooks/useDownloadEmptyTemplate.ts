import { useCallback } from "react";
import { moduleProperties } from "../../../../domain/utils/ModuleProperties";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";
import { useAppContext } from "../../../contexts/app-context";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { useSnackbar } from "@eyeseetea/d2-ui-components";

export function useDownloadEmptyTemplate(
    uploadFileType: string | undefined,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const {
        currentModuleAccess: { moduleName },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { orgUnitId, orgUnitCode },
    } = useCurrentOrgUnitContext();

    const downloadEmptyTemplate = useCallback(() => {
        setLoading(true);

        const fileType = uploadFileType === "Product Level Data" ? "PRODUCT" : "SUBSTANCE";
        compositionRoot.fileSubmission.downloadEmptyTemplate(moduleName, fileType, orgUnitId).run(
            file => {
                //download file automatically
                const downloadSimulateAnchor = document.createElement("a");
                downloadSimulateAnchor.href = URL.createObjectURL(file);
                const fileType = moduleProperties.get(moduleName)?.isSingleFileTypePerSubmission
                    ? `-${uploadFileType}`
                    : "";
                downloadSimulateAnchor.download = `${moduleName}${fileType}-${orgUnitCode}-TEMPLATE.xlsx`;
                // simulate link click
                document.body.appendChild(downloadSimulateAnchor);
                downloadSimulateAnchor.click();
                setLoading(false);
            },
            (error: string) => {
                snackbar.error("Error downloading file");
                console.error(error);
                setLoading(false);
            }
        );
    }, [compositionRoot.fileSubmission, snackbar, orgUnitId, moduleName, orgUnitCode, uploadFileType, setLoading]);

    return { downloadEmptyTemplate };
}
