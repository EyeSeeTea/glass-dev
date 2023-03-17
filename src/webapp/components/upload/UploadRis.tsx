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
import { useCurrentDataSubmissionId } from "../../hooks/useCurrentDataSubmissionId";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useLocation } from "react-router-dom";
import { useCallbackEffect } from "../../hooks/use-callback-effect";
interface UploadRisProps {
    risFile: File | null;
    setRisFile: React.Dispatch<React.SetStateAction<File | null>>;
    validate: (val: boolean) => void;
    batchId: string;
    dataAlreadySubmitted: boolean;
    setRefetchPrevUploads: React.Dispatch<React.SetStateAction<{}>>;
}

const RIS_FILE_TYPE = "RIS";

export const UploadRis: React.FC<UploadRisProps> = ({
    risFile,
    setRisFile,
    validate,
    batchId,
    dataAlreadySubmitted,
    setRefetchPrevUploads,
}) => {
    const { compositionRoot } = useAppContext();
    const location = useLocation();
    const {
        currentModuleAccess: { moduleId },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { orgUnitId },
    } = useCurrentOrgUnitContext();
    const queryParameters = new URLSearchParams(location.search);
    const period = queryParameters.get("period") || (new Date().getFullYear() - 1).toString();
    const snackbar = useSnackbar();

    const [isLoading, setIsLoading] = useState(false);
    const risFileUploadRef = useRef<DropzoneRef>(null);

    const dataSubmissionId = useCurrentDataSubmissionId(compositionRoot, moduleId, orgUnitId, parseInt(period));

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
            setIsLoading(true);
            const risUploadId = localStorage.getItem("risUploadId");
            if (risUploadId) {
                //If user has come back from step 2, delete submitted dataValues also
                if (dataAlreadySubmitted && risFile) {
                    compositionRoot.dataSubmision.RISFile(risFile, batchId, parseInt(period), "DELETES").run(
                        summary => {
                            snackbar.info(`${summary.importCount.deleted} records deleted.`);
                            return compositionRoot.glassDocuments.deleteByUploadId(risUploadId).run(
                                () => {
                                    localStorage.removeItem("risUploadId");
                                    setRisFile(null);
                                    setIsLoading(false);
                                    setRefetchPrevUploads({});
                                },
                                errorMessage => {
                                    snackbar.error(errorMessage);
                                    setRisFile(null);
                                    setIsLoading(false);
                                    setRefetchPrevUploads({});
                                }
                            );
                        },
                        error => {
                            snackbar.error(error);
                        }
                    );
                } else {
                    return compositionRoot.glassDocuments.deleteByUploadId(risUploadId).run(
                        () => {
                            localStorage.removeItem("risUploadId");
                            setRisFile(null);
                            setIsLoading(false);
                        },
                        errorMessage => {
                            snackbar.error(errorMessage);
                            setRisFile(null);
                            setIsLoading(false);
                        }
                    );
                }
            } else {
                setRisFile(null);
                setIsLoading(false);
            }
        },
        [
            compositionRoot.glassDocuments,
            snackbar,
            risFile,
            setRisFile,
            setRefetchPrevUploads,
            batchId,
            compositionRoot.dataSubmision,
            dataAlreadySubmitted,
            period,
        ]
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
                        dataSubmission: dataSubmissionId,
                        module: moduleId,
                        period,
                        orgUnit: orgUnitId,
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
        [batchId, compositionRoot.glassDocuments, dataSubmissionId, moduleId, orgUnitId, period, setRisFile, snackbar]
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
