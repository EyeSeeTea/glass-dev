import React, { useCallback, useEffect, useRef } from "react";
import { Button, CircularProgress } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import BackupIcon from "@material-ui/icons/Backup";
import CloseIcon from "@material-ui/icons/Close";
import { FileRejection } from "react-dropzone";
import { Dropzone, DropzoneRef } from "../dropzone/Dropzone";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { RemoveContainer, StyledRemoveButton } from "./UploadFiles";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentDataSubmissionId } from "../../hooks/useCurrentDataSubmissionId";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { EffectFn, useCallbackEffect } from "../../hooks/use-callback-effect";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";

interface UploadSecondaryProps {
    secondaryFile: File | null;
    setSecondaryFile: (maybeFile: File | null) => void;
    setHasSecondaryFile: React.Dispatch<React.SetStateAction<boolean>>;
    batchId: string;
    validate: (val: boolean) => void;
    removeSecondaryFile: EffectFn<[event: React.MouseEvent<HTMLButtonElement, MouseEvent>]>;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const UploadSecondary: React.FC<UploadSecondaryProps> = ({
    batchId,
    secondaryFile,
    setSecondaryFile,
    setHasSecondaryFile,
    validate,
    removeSecondaryFile,
    isLoading,
    setIsLoading,
}) => {
    const { compositionRoot } = useAppContext();

    const {
        currentModuleAccess: { moduleId, moduleName },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { orgUnitId, orgUnitCode },
    } = useCurrentOrgUnitContext();

    const { currentPeriod } = useCurrentPeriodContext();
    const snackbar = useSnackbar();
    const secondaryFileUploadRef = useRef<DropzoneRef>(null);

    const dataSubmissionId = useCurrentDataSubmissionId(moduleId, moduleName, orgUnitId, currentPeriod);

    useEffect(() => {
        if (secondaryFile) {
            validate(true);
        } else {
            validate(false);
        }
    }, [secondaryFile, validate]);

    const openFileUploadDialog = useCallback(async () => {
        secondaryFileUploadRef.current?.openDialog();
    }, [secondaryFileUploadRef]);

    const secondaryFileUpload = useCallback(
        (files: File[], rejections: FileRejection[]) => {
            if (rejections.length > 0) {
                snackbar.error(i18n.t("Multiple uploads not allowed, please select one file"));
            } else {
                const uploadedSample = files[0];
                if (uploadedSample) {
                    setIsLoading(true);

                    return compositionRoot.fileSubmission.validateSecondaryFile(uploadedSample, moduleName).run(
                        sampleData => {
                            if (sampleData.isValid) {
                                setSecondaryFile(uploadedSample);
                                const data = {
                                    batchId,
                                    fileType: moduleProperties.get(moduleName)?.secondaryFileType ?? "",
                                    dataSubmission: dataSubmissionId,
                                    moduleId,
                                    moduleName,
                                    period: currentPeriod.toString(),
                                    orgUnitId: orgUnitId,
                                    orgUnitCode: orgUnitCode,
                                    rows: sampleData.rows,
                                    specimens: [],
                                };
                                return compositionRoot.glassDocuments.upload({ file: uploadedSample, data }).run(
                                    uploadId => {
                                        localStorage.setItem("secondaryUploadId", uploadId);
                                        setIsLoading(false);
                                        setHasSecondaryFile(true);
                                    },
                                    () => {
                                        snackbar.error(i18n.t("Error in file upload"));
                                        setIsLoading(false);
                                    }
                                );
                            } else {
                                snackbar.error(i18n.t("Incorrect File Format. Please retry with a valid file"));
                                setIsLoading(false);
                            }
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
        [
            batchId,
            compositionRoot.fileSubmission,
            compositionRoot.glassDocuments,
            currentPeriod,
            dataSubmissionId,
            moduleId,
            moduleName,
            orgUnitCode,
            orgUnitId,
            setHasSecondaryFile,
            setIsLoading,
            setSecondaryFile,
            snackbar,
        ]
    );

    const secondaryFileUploadEffect = useCallbackEffect(secondaryFileUpload);
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
                    <StyledRemoveButton onClick={removeSecondaryFile}>
                        <CloseIcon />
                    </StyledRemoveButton>
                </RemoveContainer>
            )}
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
