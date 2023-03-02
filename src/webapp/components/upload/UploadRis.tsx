import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, CircularProgress } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import BackupIcon from "@material-ui/icons/Backup";
import CloseIcon from "@material-ui/icons/Close";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { Dropzone, DropzoneRef } from "../dropzone/Dropzone";
import { FileRejection } from "react-dropzone";
import { RemoveContainer, StyledRemoveButton } from "./UploadFiles";
import { useAppContext } from "../../contexts/app-context";
import { useCallbackEffect } from "../../hooks/use-callback-effect";
interface UploadRisProps {
    validate: (val: boolean) => void;
    batchId: string;
}

const RIS_FILE_TYPE = "RIS";

export const UploadRis: React.FC<UploadRisProps> = ({ validate, batchId }) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();

    const [risFile, setRisFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const risFileUploadRef = useRef<DropzoneRef>(null);

    const openFileUploadDialog = useCallback(async () => {
        risFileUploadRef.current?.openDialog();
    }, [risFileUploadRef]);

    useEffect(() => {
        if (risFile) {
            validate(true);
        } else {
            validate(false);
        }
    }, [risFile, validate]);

    const removeFiles = useCallback(
        (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            event.preventDefault();
            const risUploadId = localStorage.getItem("risUploadId");
            if (risUploadId) {
                return compositionRoot.glassDocuments.deleteByUploadId(risUploadId).run(
                    () => {
                        localStorage.removeItem("risUploadId");
                        setRisFile(null);
                    },
                    errorMessage => {
                        snackbar.error(errorMessage);
                        setRisFile(null);
                    }
                );
            }
        },
        [compositionRoot.glassDocuments, snackbar]
    );

    const removeFilesEffect = useCallbackEffect(removeFiles);

    const risFileUpload = useCallback(
        (files: File[], rejections: FileRejection[]) => {
            if (rejections.length > 0) {
                snackbar.error(i18n.t("Multiple uploads not allowed, please select one file"));
            } else {
                const uploadedRisFile = files[0];
                if (uploadedRisFile) {
                    setIsLoading(true);
                    setRisFile(uploadedRisFile);
                    const data = {
                        batchId,
                        fileType: RIS_FILE_TYPE,
                    };
                    return compositionRoot.glassDocuments.upload({ file: uploadedRisFile, data }).run(
                        uploadId => {
                            localStorage.setItem("risUploadId", uploadId);
                            setIsLoading(false);
                        },
                        () => {
                            snackbar.error(i18n.t("Error in file upload"));
                            setIsLoading(false);
                        }
                    );
                }
            }
        },
        [batchId, compositionRoot.glassDocuments, snackbar]
    );

    const risFileUploadEffect = useCallbackEffect(risFileUpload);

    return (
        <ContentWrapper className="ris-file">
            <span className="label">{i18n.t("Choose RIS File")}</span>
            {/* Allow only one file upload per dataset */}
            <Dropzone ref={risFileUploadRef} onDrop={risFileUploadEffect} maxFiles={1}>
                <Button
                    variant="contained"
                    color="primary"
                    className="choose-file-button"
                    endIcon={<BackupIcon />}
                    onClick={openFileUploadDialog}
                    disabled={risFile === null ? false : true}
                >
                    {i18n.t("Select file")}
                </Button>
                {isLoading && <CircularProgress size={25} />}
            </Dropzone>
            {risFile && (
                <RemoveContainer>
                    {risFile?.name} - {risFile?.type}
                    <StyledRemoveButton onClick={removeFilesEffect}>
                        <CloseIcon />
                    </StyledRemoveButton>
                </RemoveContainer>
            )}
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
