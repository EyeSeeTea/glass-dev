import React, { useState } from "react";
import {
    Backdrop,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography,
} from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { UploadPrimaryFile } from "./UploadPrimaryFile";
import { UploadSecondary } from "./UploadSecondary";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { ImportSummary } from "../../../domain/entities/data-entry/ImportSummary";
import { StyledLoaderContainer } from "./ConsistencyChecks";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { useBatchHandling } from "./hooks/useBatchHandling";
import { BatchDropDown } from "./BatchDropDown";
import { useDownloadEmptyTemplate } from "./hooks/useDownloadEmptyTemplate";
import { useFileSubmission } from "./hooks/useFileSubmission";

interface UploadFilesProps {
    changeStep: (step: number) => void;
    primaryFile: File | null;
    setPrimaryFile: React.Dispatch<React.SetStateAction<File | null>>;
    secondaryFile: File | null;
    setSecondaryFile: React.Dispatch<React.SetStateAction<File | null>>;
    batchId: string;
    setBatchId: React.Dispatch<React.SetStateAction<string>>;
    setPrimaryFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>;
    setSecondaryFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>;
}

export const UploadFiles: React.FC<UploadFilesProps> = ({
    changeStep,
    primaryFile,
    setPrimaryFile,
    secondaryFile,
    setSecondaryFile,
    batchId,
    setBatchId,
    setPrimaryFileImportSummary,
    setSecondaryFileImportSummary,
}) => {
    const [loading, setLoading] = useState<boolean>(false);
    const {
        currentModuleAccess: { moduleName },
    } = useCurrentModuleContext();

    const currentModuleProperties = moduleProperties.get(moduleName);

    const { changeFileType, continueClick, uploadFileType, setHasSecondaryFile, importLoading } = useFileSubmission(
        changeStep,
        primaryFile,
        secondaryFile,
        batchId,
        setPrimaryFileImportSummary,
        setSecondaryFileImportSummary
    );

    const {
        previousBatchIdsLoading,
        previousUploadsBatchIds,
        changeBatchId,
        setIsPrimaryFileValid,
        setIsSecondaryFileValid,
        isValidated,
    } = useBatchHandling(uploadFileType, batchId, setBatchId, setLoading);

    const { downloadEmptyTemplate } = useDownloadEmptyTemplate(uploadFileType, setLoading);

    return (
        <ContentWrapper>
            <Backdrop open={loading} style={{ color: "#fff", zIndex: 1 }}>
                <StyledLoaderContainer>
                    <CircularProgress color="inherit" size={50} />
                    <Typography variant="h6">{i18n.t("Loading")}</Typography>
                </StyledLoaderContainer>
            </Backdrop>

            <Backdrop open={importLoading} style={{ color: "#fff", zIndex: 1 }}>
                <StyledLoaderContainer>
                    <CircularProgress color="inherit" size={50} />

                    <Typography variant="h6">
                        {i18n.t(currentModuleProperties?.importLoadingMsg.line1 || "Loading")}
                    </Typography>

                    <Typography variant="h5">
                        {i18n.t(currentModuleProperties?.importLoadingMsg.line2 || "")}
                    </Typography>
                </StyledLoaderContainer>
            </Backdrop>
            {currentModuleProperties &&
            (currentModuleProperties.isSingleFileTypePerSubmission ||
                currentModuleProperties.isExternalSecondaryFile) ? (
                <>
                    <StyledSingleFileSelectContainer>
                        <FormControl variant="outlined" style={{ minWidth: 180 }}>
                            <InputLabel>{i18n.t("Choose file type")}</InputLabel>
                            <Select
                                value={uploadFileType}
                                onChange={changeFileType}
                                label={i18n.t("Choose file type")}
                                labelId="file-type-label"
                                MenuProps={{ disableScrollLock: true }}
                                disabled={primaryFile !== null || secondaryFile !== null}
                            >
                                <MenuItem
                                    key={currentModuleProperties.primaryFileType}
                                    value={currentModuleProperties.primaryFileType}
                                >
                                    {i18n.t(currentModuleProperties.primaryFileType)}
                                </MenuItem>
                                <MenuItem
                                    key={currentModuleProperties.secondaryFileType}
                                    value={currentModuleProperties.secondaryFileType}
                                >
                                    {i18n.t(currentModuleProperties.secondaryFileType)}
                                </MenuItem>
                            </Select>
                        </FormControl>
                        {uploadFileType === currentModuleProperties.primaryFileType ? (
                            <UploadPrimaryFile
                                validate={setIsPrimaryFileValid}
                                batchId={batchId}
                                primaryFile={primaryFile}
                                setPrimaryFile={setPrimaryFile}
                            />
                        ) : (
                            <UploadSecondary
                                validate={setIsSecondaryFileValid}
                                batchId={batchId}
                                secondaryFile={secondaryFile}
                                setSecondaryFile={setSecondaryFile}
                                setHasSecondaryFile={setHasSecondaryFile}
                            />
                        )}
                    </StyledSingleFileSelectContainer>

                    {previousBatchIdsLoading ? (
                        <CircularProgress size={25} />
                    ) : (
                        currentModuleProperties.isExternalSecondaryFile &&
                        uploadFileType === currentModuleProperties.secondaryFileType && (
                            <BatchDropDown
                                batchId={batchId}
                                previousUploadsBatchIds={previousUploadsBatchIds}
                                changeBatchId={changeBatchId}
                            />
                        )
                    )}
                </>
            ) : (
                <>
                    {previousBatchIdsLoading ? (
                        <CircularProgress size={25} />
                    ) : (
                        <>
                            <div className="file-fields">
                                <UploadPrimaryFile
                                    validate={setIsPrimaryFileValid}
                                    batchId={batchId}
                                    primaryFile={primaryFile}
                                    setPrimaryFile={setPrimaryFile}
                                />
                                {moduleProperties.get(moduleName)?.isSecondaryFileApplicable && (
                                    <UploadSecondary
                                        validate={setIsSecondaryFileValid}
                                        batchId={batchId}
                                        secondaryFile={secondaryFile}
                                        setSecondaryFile={setSecondaryFile}
                                        setHasSecondaryFile={setHasSecondaryFile}
                                    />
                                )}
                            </div>
                            {moduleProperties.get(moduleName)?.isbatchReq && (
                                <BatchDropDown
                                    batchId={batchId}
                                    previousUploadsBatchIds={previousUploadsBatchIds}
                                    changeBatchId={changeBatchId}
                                />
                            )}
                        </>
                    )}
                </>
            )}

            <BottomContainer>
                {previousUploadsBatchIds.length > 0 &&
                (moduleProperties.get(moduleName)?.isbatchReq ||
                    (currentModuleProperties?.isExternalSecondaryFile &&
                        uploadFileType === currentModuleProperties.secondaryFileType)) ? (
                    <div>
                        <h4>{i18n.t("You Previously Submitted:")} </h4>
                        <ul>
                            {previousUploadsBatchIds.map(batchId => (
                                <li key={batchId}>{`Batch Id ${batchId}`}</li>
                            ))}
                        </ul>
                    </div>
                ) : null}
                {moduleProperties.get(moduleName)?.isDownloadEmptyTemplateReq && (
                    <Button variant="outlined" color="primary" onClick={downloadEmptyTemplate}>
                        {i18n.t("Download empty template")}
                    </Button>
                )}
                <Button
                    variant="contained"
                    color={isValidated ? "primary" : "default"}
                    disabled={isValidated ? false : true}
                    endIcon={<ChevronRightIcon />}
                    disableElevation
                    onClick={continueClick}
                >
                    {i18n.t("Continue")}
                </Button>
            </BottomContainer>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    justify-content: center;
    align-items: center;
    .file-fields {
        align-items: baseline;
        justify-content: center;
        margin: 0 auto;
        display: grid;
        grid-template-columns: 50% 50%;
        width: 100%;
        > div:first-child {
            border-right: 1px solid ${glassColors.grey};
        }
        > div {
            padding: 30px 50px;
            display: block;
        }
        input {
            display: none;
        }
        .uploaded-list {
            list-style-type: none;
            margin: 15px 0 0 0;
            padding: 0;
            li {
                font-size: 14px;
                display: inline-flex;
                gap: 5px;
                .remove-files {
                    font-size: 13px;
                    cursor: pointer;
                    border: none;
                    background: none;
                    padding: 0;
                    color: ${glassColors.red};
                    svg {
                        width: 20px;
                        height: 20px;
                    }
                }
            }
        }
    }
    .label {
        font-weight: 400;
        margin-bottom: 15px;
        display: block;
        small {
            color: ${glassColors.grey};
        }
        svg {
            color: ${glassColors.mainPrimary};
            font-size: 15px;
            bottom: -3px;
            position: relative;
        }
    }
    .batch-id {
        h3 {
            font-size: 20px;
            font-weight: 600;
        }
    }
`;

export const StyledRemoveButton = styled.button`
    font-size: 13px;
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    color: ${glassColors.red};
    svg {
        width: 20px;
        height: 20px;
    }
`;

export const RemoveContainer = styled.div`
    display: flex;
`;

export const BottomContainer = styled.div`
    display: flex;
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    margin: 0 auto 30px auto;
    align-items: flex-end;
    width: 100%;
`;

export const StyledSingleFileSelectContainer = styled.div`
    display: flex;
    width: 100%;
    height: 100%;
    justify-content: space-evenly;
`;
