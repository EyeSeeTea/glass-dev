import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import BackupIcon from "@material-ui/icons/Backup";
import CloseIcon from "@material-ui/icons/Close";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { Dropzone, DropzoneRef } from "../dropzone/Dropzone";
import { FileRejection } from "react-dropzone";
import { RemoveContainer, StyledRemoveButton } from "./UploadFiles";

interface UploadRisProps {
    validate: (val: boolean) => void;
}
export const UploadRis: React.FC<UploadRisProps> = ({ validate }) => {
    const snackbar = useSnackbar();
    const [risFile, setRisFile] = useState<File | null>(null);
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

    const removeFiles = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
        setRisFile(null);
    };

    const risFileUpload = useCallback(
        async (files: File[], rejections: FileRejection[]) => {
            if (rejections.length > 0) {
                snackbar.error(i18n.t("Multiple uploads not allowed, please select one file"));
            } else {
                const uploadedRisFile = files[0];
                if (uploadedRisFile) {
                    // Create new FormData object and append files
                    const data = new FormData();
                    data.append(`file-`, uploadedRisFile, uploadedRisFile.name);
                    setRisFile(uploadedRisFile);

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
            <span className="label">Choose RIS File</span>
            {/* Allow only one file upload per dataset */}
            <Dropzone ref={risFileUploadRef} onDrop={risFileUpload} maxFiles={1}>
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
            </Dropzone>
            {risFile && (
                <RemoveContainer>
                    {risFile?.name} - {risFile?.type}
                    <StyledRemoveButton onClick={removeFiles}>
                        <CloseIcon />
                    </StyledRemoveButton>
                </RemoveContainer>
            )}
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
