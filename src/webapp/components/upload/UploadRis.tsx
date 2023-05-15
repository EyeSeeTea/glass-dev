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
import { useCallbackEffect } from "../../hooks/use-callback-effect";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
interface UploadRisProps {
    risFile: File | null;
    setRisFile: React.Dispatch<React.SetStateAction<File | null>>;
    validate: (val: boolean) => void;
    batchId: string;
}

const RIS_FILE_TYPE = "RIS";

export const UploadRis: React.FC<UploadRisProps> = ({ risFile, setRisFile, validate, batchId }) => {
    const { compositionRoot } = useAppContext();

    const {
        currentModuleAccess: { moduleId, moduleName },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { orgUnitId, orgUnitCode },
    } = useCurrentOrgUnitContext();

    const { currentPeriod } = useCurrentPeriodContext();
    const snackbar = useSnackbar();

    const [isLoading, setIsLoading] = useState(false);
    const risFileUploadRef = useRef<DropzoneRef>(null);

    const dataSubmissionId = useCurrentDataSubmissionId(compositionRoot, moduleId, orgUnitId, currentPeriod);

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
            } else {
                setRisFile(null);
                setIsLoading(false);
            }
        },
        [compositionRoot.glassDocuments, snackbar, setRisFile]
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

                    return compositionRoot.dataSubmision.validateRISFile(uploadedRisFile).run(
                        risData => {
                            if (risData.isValid) {
                                setRisFile(uploadedRisFile);
                                const data = {
                                    batchId,
                                    fileType: RIS_FILE_TYPE,
                                    dataSubmission: dataSubmissionId,
                                    moduleId,
                                    moduleName,
                                    period: currentPeriod.toString(),
                                    orgUnitId: orgUnitId,
                                    orgUnitCode: orgUnitCode,
                                    records: risData.records,
                                    specimens: risData.specimens,
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
                            } else {
                                snackbar.error(i18n.t("Incorrect File Format. Please retry with a valid RIS file"));
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
            compositionRoot.dataSubmision,
            compositionRoot.glassDocuments,
            currentPeriod,
            dataSubmissionId,
            moduleId,
            moduleName,
            orgUnitCode,
            orgUnitId,
            setRisFile,
            snackbar,
        ]
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
