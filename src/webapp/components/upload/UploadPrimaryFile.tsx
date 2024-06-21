import React, { useCallback, useEffect, useRef } from "react";
import { Button, CircularProgress } from "@material-ui/core";
import i18n from "@eyeseetea/d2-ui-components/locales";
import BackupIcon from "@material-ui/icons/Backup";
import CloseIcon from "@material-ui/icons/Close";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { Dropzone, DropzoneRef } from "../dropzone/Dropzone";
import { FileRejection } from "react-dropzone";
import { RemoveContainer, StyledRemoveButton } from "./UploadFiles";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentDataSubmissionId } from "../../hooks/useCurrentDataSubmissionId";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { EffectFn, useCallbackEffect } from "../../hooks/use-callback-effect";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
interface UploadPrimaryFileProps {
    primaryFile: File | null;
    setPrimaryFile: React.Dispatch<React.SetStateAction<File | null>>;
    validate: (val: boolean) => void;
    batchId: string;
    removePrimaryFile: EffectFn<[event: React.MouseEvent<HTMLButtonElement, MouseEvent>]>;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const UploadPrimaryFile: React.FC<UploadPrimaryFileProps> = ({
    primaryFile,
    setPrimaryFile,
    validate,
    batchId,
    removePrimaryFile,
    isLoading,
    setIsLoading,
}) => {
    const { compositionRoot } = useAppContext();

    const {
        currentModuleAccess: { moduleId, moduleName },
    } = useCurrentModuleContext();

    const {
        currentOrgUnitAccess: { orgUnitId, orgUnitCode },
    } = useCurrentOrgUnitContext();

    const { currentPeriod } = useCurrentPeriodContext();
    const snackbar = useSnackbar();

    const primaryFileUploadRef = useRef<DropzoneRef>(null);

    const dataSubmissionId = useCurrentDataSubmissionId(moduleId, moduleName, orgUnitId, currentPeriod);

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
            setIsLoading,
            setPrimaryFile,
            snackbar,
        ]
    );

    const primaryFileUploadEffect = useCallbackEffect(primaryFileUpload);

    return (
        <div>
            <span className="label">
                {i18n.t(moduleProperties.get(moduleName)?.primaryUploadLabel || "Choose File")}
            </span>
            {/* Allow only one file upload per dataset */}
            <Dropzone ref={primaryFileUploadRef} onDrop={primaryFileUploadEffect} maxFiles={1}>
                <Button
                    variant="contained"
                    color="primary"
                    className="choose-file-button"
                    endIcon={<BackupIcon />}
                    onClick={openFileUploadDialog}
                    disabled={primaryFile === null ? false : true}
                >
                    {i18n.t("Select file")}
                </Button>
                {isLoading && <CircularProgress size={25} />}
            </Dropzone>
            {primaryFile && (
                <RemoveContainer>
                    {primaryFile?.name} - {primaryFile?.type}
                    <StyledRemoveButton onClick={removePrimaryFile}>
                        <CloseIcon />
                    </StyledRemoveButton>
                </RemoveContainer>
            )}
        </div>
    );
};
