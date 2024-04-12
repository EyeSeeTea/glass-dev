import { useCallback, useEffect, useRef, useState } from "react";
import { useCallbackEffect } from "../../../hooks/use-callback-effect";
import { DropzoneRef } from "../../dropzone/Dropzone";
import { useAppContext } from "../../../contexts/app-context";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { FileRejection } from "react-dropzone";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { useCurrentPeriodContext } from "../../../contexts/current-period-context";
import { moduleProperties } from "../../../../domain/utils/ModuleProperties";
import { useCurrentDataSubmissionId } from "../../../hooks/useCurrentDataSubmissionId";

export function usePrimaryFile(
    primaryFile: File | null,
    setPrimaryFile: React.Dispatch<React.SetStateAction<File | null>>,
    validate: (val: boolean) => void,
    batchId: string
) {
    const { compositionRoot } = useAppContext();
    const primaryFileUploadRef = useRef<DropzoneRef>(null);
    const [isLoading, setIsLoading] = useState(false);
    const {
        currentModuleAccess: { moduleId, moduleName },
    } = useCurrentModuleContext();

    const {
        currentOrgUnitAccess: { orgUnitId, orgUnitCode },
    } = useCurrentOrgUnitContext();

    const { currentPeriod } = useCurrentPeriodContext();
    const dataSubmissionId = useCurrentDataSubmissionId(moduleId, moduleName, orgUnitId, currentPeriod);

    const snackbar = useSnackbar();

    const openFileUploadDialog = useCallback(async () => {
        primaryFileUploadRef.current?.openDialog();
    }, [primaryFileUploadRef]);

    useEffect(() => {
        if (primaryFile) {
            validate(true);
        } else {
            validate(false);
        }
    }, [primaryFile, validate]);

    const removeFiles = useCallback(
        (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            event.preventDefault();
            setIsLoading(true);
            const primaryUploadId = localStorage.getItem("primaryUploadId");
            if (primaryUploadId) {
                return compositionRoot.glassDocuments.deleteByUploadId(primaryUploadId).run(
                    () => {
                        localStorage.removeItem("primaryUploadId");
                        setPrimaryFile(null);
                        setIsLoading(false);
                    },
                    errorMessage => {
                        snackbar.error(errorMessage);
                        setPrimaryFile(null);
                        setIsLoading(false);
                    }
                );
            } else {
                setPrimaryFile(null);
                setIsLoading(false);
            }
        },
        [compositionRoot.glassDocuments, snackbar, setPrimaryFile]
    );

    const removeFilesEffect = useCallbackEffect(removeFiles);

    const primaryFileUpload = useCallback(
        (files: File[], rejections: FileRejection[]) => {
            if (rejections.length > 0) {
                snackbar.error(i18n.t("Multiple uploads not allowed, please select one file"));
            } else {
                const uploadedPrimaryFile = files[0];
                if (uploadedPrimaryFile) {
                    setIsLoading(true);

                    return compositionRoot.fileSubmission.validatePrimaryFile(uploadedPrimaryFile, moduleName).run(
                        primaryFileData => {
                            if (primaryFileData.isValid) {
                                setPrimaryFile(uploadedPrimaryFile);
                                const primaryFileType = moduleProperties.get(moduleName)?.primaryFileType;
                                const data = {
                                    batchId,
                                    fileType: primaryFileType !== undefined ? primaryFileType : moduleName,
                                    dataSubmission: dataSubmissionId,
                                    moduleId,
                                    moduleName,
                                    period: currentPeriod.toString(),
                                    orgUnitId: orgUnitId,
                                    orgUnitCode: orgUnitCode,
                                    rows: primaryFileData.rows,
                                    specimens: primaryFileData.specimens,
                                };
                                return compositionRoot.glassDocuments.upload({ file: uploadedPrimaryFile, data }).run(
                                    uploadId => {
                                        localStorage.setItem("primaryUploadId", uploadId);
                                        setIsLoading(false);
                                    },
                                    () => {
                                        snackbar.error(i18n.t("Error in file upload"));
                                        setIsLoading(false);
                                    }
                                );
                            } else {
                                snackbar.error(i18n.t("Incorrect File Format. Please retry with a valid file"));
                                setIsLoading(false);
                            }
                        },
                        _error => {
                            snackbar.error(i18n.t("Error in file upload"));
                            setIsLoading(false);
                        }
                    );
                }
            }
        },
        [
            batchId,
            compositionRoot.fileSubmission,
            compositionRoot.glassDocuments,
            currentPeriod,
            dataSubmissionId,
            moduleId,
            moduleName,
            orgUnitCode,
            orgUnitId,
            setPrimaryFile,
            snackbar,
        ]
    );

    const primaryFileUploadEffect = useCallbackEffect(primaryFileUpload);

    return { openFileUploadDialog, removeFilesEffect, primaryFileUploadEffect, primaryFileUploadRef, isLoading };
}
