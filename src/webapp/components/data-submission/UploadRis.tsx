import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import BackupIcon from "@material-ui/icons/Backup";
import CloseIcon from "@material-ui/icons/Close";

interface UploadRisProps {
    validate: (val: boolean) => void;
}
export const UploadRis: React.FC<UploadRisProps> = ({ validate }) => {
    const [fileList, setFileList] = useState<FileList | null>(null);

    useEffect(() => {
        if (fileList?.length) {
            validate(true);
        } else {
            validate(false);
        }
    }, [fileList, validate]);

    const inputRef = useRef<HTMLInputElement>(null);

    const files = fileList ? [...fileList] : [];

    const updateFiles = (e: ChangeEvent<HTMLInputElement>) => {
        setFileList(e.target.files);
    };

    const selectFile = () => {
        if (inputRef.current != null) {
            inputRef.current.click();
        }
    };

    const removeFiles = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
        setFileList(null);
    };

    const uploadFiles = () => {
        if (!fileList) {
            return;
        }
        // Create new FormData object and append files
        const data = new FormData();
        files.forEach((file, i) => {
            data.append(`file-${i}`, file, file.name);
        });

        // TEST: Uploading the files using the fetch API to mock bin server
        fetch("https://httpbin.org/post", {
            method: "POST",
            body: data,
        })
            .then(res => res.json())
            .then(data => console.debug(data))
            .catch(err => console.error(err));
    };

    return (
        <ContentWrapper className="ris-file">
            <span className="label">Choose RIS File</span>
            {fileList?.length ? (
                <Button
                    variant="contained"
                    color="primary"
                    className="choose-file-button"
                    endIcon={<BackupIcon />}
                    onClick={uploadFiles}
                >
                    {i18n.t("Upload file")}
                </Button>
            ) : (
                <Button
                    variant="contained"
                    color="primary"
                    className="choose-file-button"
                    endIcon={<BackupIcon />}
                    onClick={selectFile}
                >
                    {i18n.t("Select file")}
                </Button>
            )}

            <input ref={inputRef} type="file" onChange={updateFiles} multiple />

            <ul className="uploaded-list">
                {files.map((file, i) => (
                    <li key={i}>
                        {file.name} - {file.type}
                        <button className="remove-files" onClick={removeFiles}>
                            <CloseIcon />
                        </button>
                    </li>
                ))}
            </ul>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
