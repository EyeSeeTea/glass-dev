import React from "react";
import { Button, CircularProgress } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import BackupIcon from "@material-ui/icons/Backup";
import CloseIcon from "@material-ui/icons/Close";
import { Dropzone } from "../dropzone/Dropzone";
import { RemoveContainer, StyledRemoveButton } from "./UploadFiles";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { useSecondaryFile } from "./hooks/useSecondaryFile";

interface UploadSecondaryProps {
    secondaryFile: File | null;
    setSecondaryFile: React.Dispatch<React.SetStateAction<File | null>>;
    setHasSecondaryFile: React.Dispatch<React.SetStateAction<boolean>>;
    batchId: string;
    validate: (val: boolean) => void;
}

export const UploadSecondary: React.FC<UploadSecondaryProps> = ({
    batchId,
    secondaryFile,
    setSecondaryFile,
    setHasSecondaryFile,
    validate,
}) => {
    const {
        currentModuleAccess: { moduleName },
    } = useCurrentModuleContext();

    const { isLoading, openFileUploadDialog, removeFilesEffect, secondaryFileUploadEffect, secondaryFileUploadRef } =
        useSecondaryFile(secondaryFile, setSecondaryFile, setHasSecondaryFile, batchId, validate);

    const uploadLabel = moduleProperties.get(moduleName)?.secondaryUploadLabel?.split(",");

    return (
        <ContentWrapper className="ris-file">
            {uploadLabel && (
                <span className="label">
                    {i18n.t(uploadLabel.at(0) ?? "")} <small>{i18n.t(uploadLabel.at(1) ?? "")}</small>
                </span>
            )}
            {/* Allow only one file upload per dataset */}
            <Dropzone ref={secondaryFileUploadRef} onDrop={secondaryFileUploadEffect} maxFiles={1}>
                <Button
                    variant="contained"
                    color="primary"
                    className="choose-file-button"
                    endIcon={<BackupIcon />}
                    onClick={openFileUploadDialog}
                    disabled={secondaryFile === null ? false : true}
                >
                    {i18n.t("Select file")}
                </Button>
                {isLoading && <CircularProgress size={25} />}
            </Dropzone>
            {secondaryFile && (
                <RemoveContainer>
                    {secondaryFile?.name} - {secondaryFile?.type}
                    <StyledRemoveButton onClick={removeFilesEffect}>
                        <CloseIcon />
                    </StyledRemoveButton>
                </RemoveContainer>
            )}
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
