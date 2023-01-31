import React, { useCallback, useRef, useState } from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import BackupIcon from "@material-ui/icons/Backup";
import HelpIcon from "@material-ui/icons/Help";
import CloseIcon from "@material-ui/icons/Close";
import { FileRejection } from "react-dropzone";
import { Dropzone, DropzoneRef } from "../dropzone/Dropzone";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { RemoveContainer, StyledRemoveButton } from "./UploadFiles";

export const UploadSample: React.FC = () => {
    const snackbar = useSnackbar();
    const [sampleFile, setSampleFile] = useState<File | null>(null);
    const sampleFileUploadRef = useRef<DropzoneRef>(null);

    const openFileUploadDialog = useCallback(async () => {
        sampleFileUploadRef.current?.openDialog();
    }, [sampleFileUploadRef]);

    const removeFiles = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
        setSampleFile(null);
    };

    const sampleFileUpload = useCallback(
        async (files: File[], rejections: FileRejection[]) => {
            if (rejections.length > 0) {
                snackbar.error(i18n.t("Multiple uploads not allowed, please select one file"));
            } else {
                const uploadedSample = files[0];
                if (uploadedSample) {
                    // Create new FormData object and append files
                    const data = new FormData();
                    data.append(`file-`, uploadedSample, uploadedSample.name);
                    setSampleFile(uploadedSample);

                    // TEST: Uploading the files using the fetch API to mock bin server
                    fetch("https://httpbin.org/post", {
                        method: "POST",
                        body: data,
                    })
                        .then(res => res.json())
                        .then(data => console.debug(data))
                        .catch(err => console.debug(err));
                } else {
                    snackbar.error(i18n.t("Error in file upload"));
                }
            }
        },
        [snackbar]
    );

    return (
        <ContentWrapper className="ris-file">
            <span className="label">
                SAMPLE File <small>(not required)</small> <HelpIcon />
            </span>
            {/* Allow only one file upload per dataset */}
            <Dropzone ref={sampleFileUploadRef} onDrop={sampleFileUpload} maxFiles={1}>
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
            </Dropzone>
            {sampleFile && (
                <RemoveContainer>
                    {sampleFile?.name} - {sampleFile?.type}
                    <StyledRemoveButton onClick={removeFiles}>
                        <CloseIcon />
                    </StyledRemoveButton>
                </RemoveContainer>
            )}
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
