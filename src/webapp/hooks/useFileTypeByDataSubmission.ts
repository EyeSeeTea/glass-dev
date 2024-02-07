import { useEffect, useState } from "react";
import { useCurrentModuleContext } from "../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../contexts/current-orgUnit-context";
import { useCurrentPeriodContext } from "../contexts/current-period-context";
import { useCurrentDataSubmissionId } from "./useCurrentDataSubmissionId";
import { useAppContext } from "../contexts/app-context";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { GlassState } from "./State";

type GlassUploadsState = GlassState<string | undefined>;

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
            dataSubmissionId &&
            compositionRoot.glassUploads.getCurrentDataSubmissionFileType(dataSubmissionId).run(
                uploads => {
                    // Using first upload, only one upload per dataSubmission & period
                    const completedUpload = uploads.filter(upload => upload.status === "COMPLETED")?.[0];
                    if (completedUpload) {
                        const fileType =
                            completedUpload.fileType === "Substance Level Data"
                                ? "SUBSTANCE"
                                : completedUpload.fileType === "Product Level Data"
                                ? "PRODUCT"
                                : undefined;

                        if (fileType) {
                            setFileTypeState({
                                kind: "loaded",
                                data: fileType,
                            });
                        }
                    } else {
                        setFileTypeState({
                            kind: "loaded",
                            data: undefined,
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
