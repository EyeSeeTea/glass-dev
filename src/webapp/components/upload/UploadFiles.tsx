import React, { useCallback, useEffect, useState } from "react";
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
import { useAppContext } from "../../contexts/app-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { Future } from "../../../domain/entities/Future";
import { ImportSummary } from "../../../domain/entities/data-entry/ImportSummary";
import { StyledLoaderContainer } from "./ConsistencyChecks";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { EffectFn } from "../../hooks/use-callback-effect";

interface UploadFilesProps {
    changeStep: (step: number) => void;
    primaryFile: File | null;
    setPrimaryFile: React.Dispatch<React.SetStateAction<File | null>>;
    secondaryFile: File | null;
    setSecondaryFile: (maybeFile: File | null) => void;
    batchId: string;
    setBatchId: React.Dispatch<React.SetStateAction<string>>;
    setPrimaryFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>;
    setSecondaryFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>;
    removePrimaryFile: EffectFn<[event: React.MouseEvent<HTMLButtonElement, MouseEvent>]>;
    removeSecondaryFile: EffectFn<[event: React.MouseEvent<HTMLButtonElement, MouseEvent>]>;
    hasSecondaryFile: boolean;
    setHasSecondaryFile: React.Dispatch<React.SetStateAction<boolean>>;
    isLoadingPrimary: boolean;
    setIsLoadingSecondary: React.Dispatch<React.SetStateAction<boolean>>;
    isLoadingSecondary: boolean;
    setIsLoadingPrimary: React.Dispatch<React.SetStateAction<boolean>>;
}

const UPLOADED_STATUS = "uploaded";

const datasetOptions = [
    {
        label: "Dataset 1",
        value: "DS1",
    },
    {
        label: "Dataset 2",
        value: "DS2",
    },
    {
        label: "Dataset 3",
        value: "DS3",
    },
    {
        label: "Dataset 4",
        value: "DS4",
    },
    {
        label: "Dataset 5",
        value: "DS5",
    },
    {
        label: "Dataset 6",
        value: "DS6",
    },
];

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
    removePrimaryFile,
    removeSecondaryFile,
    hasSecondaryFile,
    setHasSecondaryFile,
    isLoadingPrimary,
    setIsLoadingPrimary,
    isLoadingSecondary,
    setIsLoadingSecondary,
}) => {
    const { compositionRoot, currentUser } = useAppContext();
    const snackbar = useSnackbar();
    const [isValidated, setIsValidated] = useState(false);
    const [isPrimaryFileValid, setIsPrimaryFileValid] = useState(false);
    const [isSecondaryFileValid, setIsSecondaryFileValid] = useState(false);
    const [previousUploadsBatchIds, setPreviousUploadsBatchIds] = useState<string[]>([]);
    const [importLoading, setImportLoading] = useState<boolean>(false);
    const [previousBatchIdsLoading, setPreviousBatchIdsLoading] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const {
        currentModuleAccess: { moduleName },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { orgUnitId, orgUnitName, orgUnitCode },
    } = useCurrentOrgUnitContext();
    const { currentPeriod } = useCurrentPeriodContext();

    const currentModuleProperties = moduleProperties.get(moduleName);
    const [uploadFileType, setUploadFileType] = useState(
        secondaryFile ? currentModuleProperties?.secondaryFileType : currentModuleProperties?.primaryFileType
    );

    useEffect(() => {
        if (
            currentModuleProperties?.isbatchReq ||
            (currentModuleProperties?.isExternalSecondaryFile &&
                uploadFileType === currentModuleProperties.secondaryFileType)
        ) {
            setPreviousBatchIdsLoading(true);

            compositionRoot.glassUploads.getAMRUploadsForCurrentDataSubmission(orgUnitId, currentPeriod).run(
                uploads => {
                    const uniquePreviousBatchIds = _(
                        uploads
                            .filter(upload => upload.status.toLowerCase() !== UPLOADED_STATUS && upload.batchId !== "")
                            .map(upload => upload.batchId)
                    )
                        .uniq()
                        .value();
                    setPreviousUploadsBatchIds(uniquePreviousBatchIds);
                    const firstSelectableBatchId = datasetOptions.find(
                        ({ value }) => !uniquePreviousBatchIds.includes(value)
                    )?.value;
                    setBatchId(firstSelectableBatchId || "");
                    setPreviousBatchIdsLoading(false);
                },
                () => {
                    snackbar.error(i18n.t("Error fetching previous uploads."));
                    setPreviousBatchIdsLoading(false);
                }
            );
        } else {
            setPreviousBatchIdsLoading(false);
        }
    }, [
        compositionRoot.glassUploads,
        setBatchId,
        snackbar,
        moduleName,
        currentPeriod,
        orgUnitId,
        currentModuleProperties,
        uploadFileType,
    ]);

    useEffect(() => {
        if (moduleProperties.get(moduleName)?.isbatchReq) {
            if (batchId && isPrimaryFileValid) {
                setIsValidated(true);
            } else {
                setIsValidated(false);
            }
        } else if (moduleProperties.get(moduleName)?.isSingleFileTypePerSubmission) {
            if (isPrimaryFileValid || isSecondaryFileValid) setIsValidated(true);
            else setIsValidated(false);
        } else if (moduleProperties.get(moduleName)?.isExternalSecondaryFile) {
            if (isPrimaryFileValid) setIsValidated(true);
            else if (batchId && isSecondaryFileValid) setIsValidated(true);
            else setIsValidated(false);
        } else {
            if (isPrimaryFileValid) setIsValidated(true);
        }
    }, [batchId, isPrimaryFileValid, isSecondaryFileValid, moduleName]);

    const changeBatchId = async (event: React.ChangeEvent<{ value: unknown }>) => {
        const batchId = event.target.value as string;
        const primaryUploadId = localStorage.getItem("primaryUploadId");
        const secondaryUploadId = localStorage.getItem("secondaryUploadId");
        setBatchId(batchId);
        if (primaryUploadId) {
            setLoading(true);
            compositionRoot.glassUploads.setBatchId({ id: primaryUploadId, batchId }).run(
                () => {
                    if (secondaryUploadId) {
                        compositionRoot.glassUploads.setBatchId({ id: secondaryUploadId, batchId }).run(
                            () => {
                                setLoading(false);
                            },
                            () => {
                                console.debug(`error occured while updating batch id to secondary upload in datastore`);
                                setLoading(false);
                            }
                        );
                    } else setLoading(false);
                },
                () => {
                    console.debug(`error occured while updating batch id to primary upload in datastore`);
                    setLoading(false);
                }
            );
        } else if (secondaryUploadId) {
            setLoading(true);
            compositionRoot.glassUploads.setBatchId({ id: secondaryUploadId, batchId }).run(
                () => {
                    setLoading(false);
                },
                () => {
                    console.debug(`error occured while updating batch id to secondary upload in datastore`);
                    setLoading(false);
                }
            );
        }
    };

    const changeFileType = (event: React.ChangeEvent<{ value: unknown }>) => {
        const fileType = event.target.value as string;
        setUploadFileType(fileType);
    };

    const uploadFileSubmissions = useCallback(() => {
        if (primaryFile) {
            setImportLoading(true);
            Future.joinObj({
                importPrimaryFileSummary: compositionRoot.fileSubmission.primaryFile(
                    moduleName,
                    primaryFile,
                    batchId,
                    currentPeriod,
                    "CREATE_AND_UPDATE",
                    orgUnitId,
                    orgUnitName,
                    orgUnitCode,
                    true,
                    "",
                    currentUser.userOrgUnitsAccess
                ),
                importSecondaryFileSummary: secondaryFile
                    ? compositionRoot.fileSubmission.secondaryFile(
                          secondaryFile,
                          batchId,
                          moduleName,
                          currentPeriod,
                          "CREATE_AND_UPDATE",
                          orgUnitId,
                          orgUnitName,
                          orgUnitCode,
                          true,
                          ""
                      )
                    : Future.success(undefined),
            }).run(
                ({ importPrimaryFileSummary, importSecondaryFileSummary }) => {
                    setPrimaryFileImportSummary(importPrimaryFileSummary);

                    if (importSecondaryFileSummary) {
                        setSecondaryFileImportSummary(importSecondaryFileSummary);
                    }

                    const primaryUploadId = localStorage.getItem("primaryUploadId");

                    if (primaryUploadId) {
                        const secondaryUploadId = localStorage.getItem("secondaryUploadId");

                        const params = secondaryUploadId
                            ? {
                                  primaryUploadId,
                                  primaryImportSummaryErrors: {
                                      nonBlockingErrors: importPrimaryFileSummary?.nonBlockingErrors || [],
                                      blockingErrors: importPrimaryFileSummary?.blockingErrors || [],
                                  },
                                  secondaryUploadId,
                                  secondaryImportSummaryErrors: {
                                      nonBlockingErrors: importSecondaryFileSummary?.nonBlockingErrors || [],
                                      blockingErrors: importSecondaryFileSummary?.blockingErrors || [],
                                  },
                              }
                            : {
                                  primaryUploadId,
                                  primaryImportSummaryErrors: {
                                      nonBlockingErrors: importPrimaryFileSummary?.nonBlockingErrors || [],
                                      blockingErrors: importPrimaryFileSummary?.blockingErrors || [],
                                  },
                              };

                        compositionRoot.glassUploads.saveImportSummaryErrorsOfFiles(params).run(
                            () => {},
                            () => {}
                        );

                        if (
                            !currentModuleProperties?.isDryRunReq &&
                            importPrimaryFileSummary.blockingErrors.length === 0
                        )
                            compositionRoot.glassUploads.setStatus({ id: primaryUploadId, status: "VALIDATED" }).run(
                                () => {},
                                () => {}
                            );
                    }

                    setImportLoading(false);
                    changeStep(2);
                },
                error => {
                    setPrimaryFileImportSummary({
                        status: "ERROR",
                        importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
                        nonBlockingErrors: [],
                        blockingErrors: [{ error: error, count: 1 }],
                    });
                    setImportLoading(false);
                    changeStep(2);
                }
            );
        } //secondary file upload only
        else if (secondaryFile) {
            setImportLoading(true);
            compositionRoot.fileSubmission
                .secondaryFile(
                    secondaryFile,
                    batchId,
                    moduleName,
                    currentPeriod,
                    "CREATE_AND_UPDATE",
                    orgUnitId,
                    orgUnitName,
                    orgUnitCode,
                    true,
                    ""
                )
                .run(
                    importSubstanceFileSummary => {
                        if (importSubstanceFileSummary) {
                            setPrimaryFileImportSummary(importSubstanceFileSummary);
                            const secondaryUploadId = localStorage.getItem("secondaryUploadId");

                            if (
                                !currentModuleProperties?.isDryRunReq &&
                                importSubstanceFileSummary.blockingErrors.length === 0 &&
                                secondaryUploadId
                            )
                                compositionRoot.glassUploads
                                    .setStatus({ id: secondaryUploadId, status: "VALIDATED" })
                                    .run(
                                        () => {},
                                        () => {}
                                    );
                        }
                        setImportLoading(false);
                        changeStep(2);
                    },
                    error => {
                        setPrimaryFileImportSummary({
                            status: "ERROR",
                            importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
                            nonBlockingErrors: [],
                            blockingErrors: [{ error: error, count: 1 }],
                        });
                        setImportLoading(false);
                        changeStep(2);
                    }
                );
        }
    }, [
        primaryFile,
        secondaryFile,
        compositionRoot.fileSubmission,
        compositionRoot.glassUploads,
        moduleName,
        batchId,
        currentPeriod,
        orgUnitId,
        orgUnitName,
        orgUnitCode,
        currentUser.userOrgUnitsAccess,
        setPrimaryFileImportSummary,
        changeStep,
        setSecondaryFileImportSummary,
        currentModuleProperties?.isDryRunReq,
    ]);

    const continueClick = () => {
        if (!hasSecondaryFile) {
            localStorage.removeItem("secondaryUploadId");
            uploadFileSubmissions();
        } else if (!moduleProperties.get(moduleName)?.isSecondaryRelated) {
            uploadFileSubmissions();
        }
        //update the secondary file with primary file upload id.
        else {
            setImportLoading(true);
            const primaryUploadId = localStorage.getItem("primaryUploadId");
            const secondaryUploadId = localStorage.getItem("secondaryUploadId");
            if (secondaryUploadId && primaryUploadId)
                compositionRoot.glassDocuments.updateSecondaryFileWithPrimaryId(secondaryUploadId, primaryUploadId).run(
                    () => {
                        uploadFileSubmissions();
                    },
                    () => {
                        console.debug("Error updating datastore");
                    }
                );
        }
    };

    const downloadEmptyTemplate = useCallback(() => {
        setLoading(true);

        const fileType = uploadFileType === "Product Level Data" ? "PRODUCT" : "SUBSTANCE";
        compositionRoot.fileSubmission.downloadEmptyTemplate(moduleName, fileType, orgUnitId).run(
            file => {
                //download file automatically
                const downloadSimulateAnchor = document.createElement("a");
                downloadSimulateAnchor.href = URL.createObjectURL(file);
                const fileType = moduleProperties.get(moduleName)?.isSingleFileTypePerSubmission
                    ? `-${uploadFileType}`
                    : "";
                downloadSimulateAnchor.download = `${moduleName}${fileType}-${orgUnitCode}-TEMPLATE.xlsx`;
                // simulate link click
                document.body.appendChild(downloadSimulateAnchor);
                downloadSimulateAnchor.click();
                setLoading(false);
            },
            (error: string) => {
                snackbar.error("Error downloading file");
                console.error(error);
                setLoading(false);
            }
        );
    }, [compositionRoot.fileSubmission, snackbar, orgUnitId, moduleName, orgUnitCode, uploadFileType]);

    const getBatchIdDropDown = () => {
        return (
            <div className="batch-id">
                <h3>{i18n.t("Batch ID")}</h3>
                <FormControl variant="outlined" style={{ minWidth: 180 }}>
                    <InputLabel id="dataset-label">{i18n.t("Choose a Dataset")}</InputLabel>
                    <Select
                        value={batchId}
                        onChange={changeBatchId}
                        label={i18n.t("Choose a Dataset")}
                        labelId="dataset-label"
                        MenuProps={{ disableScrollLock: true }}
                    >
                        {datasetOptions.map(({ label, value }) => (
                            <MenuItem key={value} value={value} disabled={previousUploadsBatchIds.includes(value)}>
                                {i18n.t(label)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </div>
        );
    };

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
                                removePrimaryFile={removePrimaryFile}
                                isLoading={isLoadingPrimary}
                                setIsLoading={setIsLoadingPrimary}
                            />
                        ) : (
                            <UploadSecondary
                                validate={setIsSecondaryFileValid}
                                batchId={batchId}
                                secondaryFile={secondaryFile}
                                setSecondaryFile={setSecondaryFile}
                                setHasSecondaryFile={setHasSecondaryFile}
                                removeSecondaryFile={removeSecondaryFile}
                                isLoading={isLoadingSecondary}
                                setIsLoading={setIsLoadingSecondary}
                            />
                        )}
                    </StyledSingleFileSelectContainer>

                    {previousBatchIdsLoading ? (
                        <CircularProgress size={25} />
                    ) : (
                        currentModuleProperties.isExternalSecondaryFile &&
                        uploadFileType === currentModuleProperties.secondaryFileType &&
                        getBatchIdDropDown()
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
                                    removePrimaryFile={removePrimaryFile}
                                    isLoading={isLoadingPrimary}
                                    setIsLoading={setIsLoadingPrimary}
                                />
                                {moduleProperties.get(moduleName)?.isSecondaryFileApplicable && (
                                    <UploadSecondary
                                        validate={setIsSecondaryFileValid}
                                        batchId={batchId}
                                        secondaryFile={secondaryFile}
                                        setSecondaryFile={setSecondaryFile}
                                        setHasSecondaryFile={setHasSecondaryFile}
                                        removeSecondaryFile={removeSecondaryFile}
                                        isLoading={isLoadingSecondary}
                                        setIsLoading={setIsLoadingSecondary}
                                    />
                                )}
                            </div>
                            {moduleProperties.get(moduleName)?.isbatchReq && getBatchIdDropDown()}
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
