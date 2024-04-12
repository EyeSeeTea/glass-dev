import React from "react";
import { Button, CircularProgress } from "@material-ui/core";
import i18n from "@eyeseetea/d2-ui-components/locales";
import BackupIcon from "@material-ui/icons/Backup";
import CloseIcon from "@material-ui/icons/Close";
import { Dropzone } from "../dropzone/Dropzone";
import { RemoveContainer, StyledRemoveButton } from "./UploadFiles";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { usePrimaryFile } from "./hooks/usePrimaryFile";
interface UploadPrimaryFileProps {
    primaryFile: File | null;
    setPrimaryFile: React.Dispatch<React.SetStateAction<File | null>>;
    validate: (val: boolean) => void;
    batchId: string;
}

export const UploadPrimaryFile: React.FC<UploadPrimaryFileProps> = ({
    primaryFile,
    setPrimaryFile,
    validate,
    batchId,
}) => {
    const {
        currentModuleAccess: { moduleName },
    } = useCurrentModuleContext();

    const { openFileUploadDialog, removeFilesEffect, primaryFileUploadEffect, primaryFileUploadRef, isLoading } =
        usePrimaryFile(primaryFile, setPrimaryFile, validate, batchId);
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
                    <StyledRemoveButton onClick={removeFilesEffect}>
                        <CloseIcon />
                    </StyledRemoveButton>
                </RemoveContainer>
            )}
        </div>
    );
};
