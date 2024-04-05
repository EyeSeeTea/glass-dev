import { useEffect, useState } from "react";
import { moduleProperties } from "../../../../domain/utils/ModuleProperties";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";
import { useAppContext } from "../../../contexts/app-context";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { useCurrentPeriodContext } from "../../../contexts/current-period-context";
import { UPLOADED_STATUS, datasetOptions } from "../../../../domain/entities/data-entry/amr-external/DatsetOptions";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import i18n from "@eyeseetea/d2-ui-components/locales";

export function useBatchHandling(
    uploadFileType: string | undefined,
    batchId: string,
    setBatchId: React.Dispatch<React.SetStateAction<string>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
    const [previousBatchIdsLoading, setPreviousBatchIdsLoading] = useState<boolean>(true);
    const [previousUploadsBatchIds, setPreviousUploadsBatchIds] = useState<string[]>([]);
    const [isValidated, setIsValidated] = useState(false);
    const [isPrimaryFileValid, setIsPrimaryFileValid] = useState(false);
    const [isSecondaryFileValid, setIsSecondaryFileValid] = useState(false);

    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const {
        currentModuleAccess: { moduleName },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { orgUnitId },
    } = useCurrentOrgUnitContext();
    const { currentPeriod } = useCurrentPeriodContext();
    const currentModuleProperties = moduleProperties.get(moduleName);

    useEffect(() => {
        if (
            currentModuleProperties?.isbatchReq ||
            (currentModuleProperties?.isExternalSecondaryFile &&
                uploadFileType === currentModuleProperties.secondaryFileType)
        ) {
            setPreviousBatchIdsLoading(true);

            compositionRoot.glassUploads.getAMRUploadsForCurrentDataSubmission(orgUnitId, currentPeriod).run(
                uploads => {
                    const uniquePreviousBatchIds = _(
                        uploads
                            .filter(upload => upload.status.toLowerCase() !== UPLOADED_STATUS && upload.batchId !== "")
                            .map(upload => upload.batchId)
                    )
                        .uniq()
                        .value();
                    setPreviousUploadsBatchIds(uniquePreviousBatchIds);
                    const firstSelectableBatchId = datasetOptions.find(
                        ({ value }) => !uniquePreviousBatchIds.includes(value)
                    )?.value;
                    setBatchId(firstSelectableBatchId || "");
                    setPreviousBatchIdsLoading(false);
                },
                () => {
                    snackbar.error(i18n.t("Error fetching previous uploads."));
                    setPreviousBatchIdsLoading(false);
                }
            );
        } else {
            setPreviousBatchIdsLoading(false);
        }
    }, [
        compositionRoot.glassUploads,
        setBatchId,
        snackbar,
        moduleName,
        currentPeriod,
        orgUnitId,
        currentModuleProperties,
        uploadFileType,
    ]);

    useEffect(() => {
        if (moduleProperties.get(moduleName)?.isbatchReq) {
            if (batchId && isPrimaryFileValid) {
                setIsValidated(true);
            } else {
                setIsValidated(false);
            }
        } else if (moduleProperties.get(moduleName)?.isSingleFileTypePerSubmission) {
            if (isPrimaryFileValid || isSecondaryFileValid) setIsValidated(true);
            else setIsValidated(false);
        } else if (moduleProperties.get(moduleName)?.isExternalSecondaryFile) {
            if (isPrimaryFileValid) setIsValidated(true);
            else if (batchId && isSecondaryFileValid) setIsValidated(true);
            else setIsValidated(false);
        } else {
            if (isPrimaryFileValid) setIsValidated(true);
        }
    }, [batchId, isPrimaryFileValid, isSecondaryFileValid, moduleName]);

    const changeBatchId = async (event: React.ChangeEvent<{ value: unknown }>) => {
        const batchId = event.target.value as string;
        const primaryUploadId = localStorage.getItem("primaryUploadId");
        const secondaryUploadId = localStorage.getItem("secondaryUploadId");
        setBatchId(batchId);
        if (primaryUploadId) {
            setLoading(true);
            compositionRoot.glassUploads.setBatchId({ id: primaryUploadId, batchId }).run(
                () => {
                    if (secondaryUploadId) {
                        compositionRoot.glassUploads.setBatchId({ id: secondaryUploadId, batchId }).run(
                            () => {
                                setLoading(false);
                            },
                            () => {
                                console.debug(`error occured while updating batch id to secondary upload in datastore`);
                                setLoading(false);
                            }
                        );
                    } else setLoading(false);
                },
                () => {
                    console.debug(`error occured while updating batch id to primary upload in datastore`);
                    setLoading(false);
                }
            );
        } else if (secondaryUploadId) {
            setLoading(true);
            compositionRoot.glassUploads.setBatchId({ id: secondaryUploadId, batchId }).run(
                () => {
                    setLoading(false);
                },
                () => {
                    console.debug(`error occured while updating batch id to secondary upload in datastore`);
                    setLoading(false);
                }
            );
        }
    };

    return {
        previousBatchIdsLoading,
        previousUploadsBatchIds,
        changeBatchId,
        setIsPrimaryFileValid,
        setIsSecondaryFileValid,
        isValidated,
    };
}
