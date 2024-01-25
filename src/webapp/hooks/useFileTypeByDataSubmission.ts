import { useEffect, useState } from "react";
import { useCurrentModuleContext } from "../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { useCurrentPeriodContext } from "../contexts/current-period-context";
import { useCurrentDataSubmissionId } from "./useCurrentDataSubmissionId";
import { useAppContext } from "../contexts/app-context";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { GlassState } from "./State";

type GlassUploadsState = GlassState<string>;

export const useFileTypeByDataSubmission = () => {
    const [fileTypeState, setFileTypeState] = useState<GlassUploadsState>({ kind: "loading" });

    const { compositionRoot } = useAppContext();
    const {
        currentOrgUnitAccess: { orgUnitId },
    } = useCurrentOrgUnitContext();
    const {
        currentModuleAccess: { moduleId, moduleName },
    } = useCurrentModuleContext();
    const { currentPeriod } = useCurrentPeriodContext();
    const dataSubmissionId = useCurrentDataSubmissionId(moduleId, moduleName, orgUnitId, currentPeriod);
    const snackbar = useSnackbar();

    useEffect(() => {
        moduleName === "AMC" &&
            compositionRoot.glassUploads.getCurrentDataSubmissionFileType(dataSubmissionId).run(
                uploads => {
                    // Using first upload, only one upload per dataSubmission & period
                    const fileType = uploads[0]?.fileType;
                    const type =
                        fileType === "Substance Level Data"
                            ? "SUBSTANCE"
                            : fileType === "Product Level Data"
                            ? "PRODUCT"
                            : undefined;

                    if (type) {
                        setFileTypeState({
                            kind: "loaded",
                            data: type,
                        });
                    }
                },
                () => {
                    snackbar.error("Error fetching current data submission's upload file type");
                }
            );
    }, [compositionRoot.glassUploads, dataSubmissionId, moduleName, snackbar]);

    return fileTypeState;
};
