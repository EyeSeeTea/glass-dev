import React, { useCallback, useEffect, useRef } from "react";
import { Button, CircularProgress } from "@material-ui/core";
import i18n from "@eyeseetea/d2-ui-components/locales";
import BackupIcon from "@material-ui/icons/Backup";
import CloseIcon from "@material-ui/icons/Close";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { Dropzone, DropzoneRef } from "../dropzone/Dropzone";
import { RemoveContainer, StyledRemoveButton } from "./UploadFiles";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { useUploadPrimaryFiles } from "./useUploadPrimaryFile";
interface UploadPrimaryFileProps {
    primaryFile: File | null;
    setPrimaryFile: React.Dispatch<React.SetStateAction<File | null>>;
    validate: (val: boolean) => void;
    batchId: string;
}

export const UploadAMCPrimaryFile: React.FC<UploadPrimaryFileProps> = ({
    primaryFile,
    setPrimaryFile,
    validate,
    batchId,
}) => {
    const {
        currentModuleAccess: { moduleName },
    } = useCurrentModuleContext();

    const snackbar = useSnackbar();

    const { onDropPrimaryFile, onRemoveFiles, errorMessage, isLoading } = useUploadPrimaryFiles(
        batchId,
        setPrimaryFile
    );

    const primaryFileUploadRef = useRef<DropzoneRef>(null);

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

    useEffect(() => {
        if (errorMessage) {
            snackbar.error(errorMessage);
        }
    }, [errorMessage, snackbar]);

    return (
        <div>
            <span className="label">
                {i18n.t(moduleProperties.get(moduleName)?.primaryUploadLabel || "Choose File")}
            </span>
            {/* Allow only one file upload per dataset */}
            <Dropzone ref={primaryFileUploadRef} onDrop={onDropPrimaryFile} maxFiles={1}>
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
                    <StyledRemoveButton onClick={onRemoveFiles}>
                        <CloseIcon />
                    </StyledRemoveButton>
                </RemoveContainer>
            )}
        </div>
    );
};
