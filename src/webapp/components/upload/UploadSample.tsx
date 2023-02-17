import React, { useCallback, useRef, useState } from "react";
import { Button, CircularProgress } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import BackupIcon from "@material-ui/icons/Backup";
import HelpIcon from "@material-ui/icons/Help";
import CloseIcon from "@material-ui/icons/Close";
import { FileRejection } from "react-dropzone";
import { Dropzone, DropzoneRef } from "../dropzone/Dropzone";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { RemoveContainer, StyledRemoveButton } from "./UploadFiles";
import { useAppContext } from "../../contexts/app-context";
import { useCallbackEffect } from "../../hooks/use-callback-effect";

interface UploadSampleProps {
    batchId: string;
}

const SAMPLE_FILE_TYPE = "SAMPLE";

export const UploadSample: React.FC<UploadSampleProps> = ({ batchId }) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();

    const [sampleFile, setSampleFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const sampleFileUploadRef = useRef<DropzoneRef>(null);

    const openFileUploadDialog = useCallback(async () => {
        sampleFileUploadRef.current?.openDialog();
    }, [sampleFileUploadRef]);

    const removeFiles = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
        const sampleUploadId = localStorage.getItem("sampleUploadId");
        if (sampleUploadId) {
            return compositionRoot.glassDocuments.deleteByUploadId(sampleUploadId).run(
                () => {
                    localStorage.removeItem("sampleUploadId");
                    setSampleFile(null);
                },
                errorMessage => {
                    snackbar.error(errorMessage);
                    setSampleFile(null);
                }
            );
        }
    };

    const removeFilesEffect = useCallbackEffect(removeFiles);

    const sampleFileUpload = useCallback(
        (files: File[], rejections: FileRejection[]) => {
            if (rejections.length > 0) {
                snackbar.error(i18n.t("Multiple uploads not allowed, please select one file"));
            } else {
                const uploadedSample = files[0];
                if (uploadedSample) {
                    setIsLoading(true);
                    setSampleFile(uploadedSample);
                    const data = {
                        batchId,
                        fileType: SAMPLE_FILE_TYPE,
                    };
                    return compositionRoot.glassDocuments.upload({ file: uploadedSample, data }).run(
                        submissionId => {
                            localStorage.setItem("sampleUploadId", submissionId);
                            setIsLoading(false);
                        },
                        () => {
                            snackbar.error(i18n.t("Error in file upload"));
                            setIsLoading(false);
                        }
                    );
                } else {
                    snackbar.error(i18n.t("Error in file upload"));
                }
            }
        },
        [batchId, compositionRoot.glassDocuments, snackbar]
    );

    const sampleFileUploadEffect = useCallbackEffect(sampleFileUpload);

    return (
        <ContentWrapper className="ris-file">
            <span className="label">
                {i18n.t("SAMPLE File")} <small>({i18n.t("not required")})</small> <HelpIcon />
            </span>
            {/* Allow only one file upload per dataset */}
            <Dropzone ref={sampleFileUploadRef} onDrop={sampleFileUploadEffect} maxFiles={1}>
                <Button
                    variant="contained"
                    color="primary"
                    className="choose-file-button"
                    endIcon={<BackupIcon />}
                    onClick={openFileUploadDialog}
                    disabled={sampleFile === null ? false : true}
                >
                    {i18n.t("Select file")}
                </Button>
                {isLoading && <CircularProgress size={25} />}
            </Dropzone>
            {sampleFile && (
                <RemoveContainer>
                    {sampleFile?.name} - {sampleFile?.type}
                    <StyledRemoveButton onClick={removeFilesEffect}>
                        <CloseIcon />
                    </StyledRemoveButton>
                </RemoveContainer>
            )}
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
