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
import { UploadSample } from "./UploadSample";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentDataSubmissionId } from "../../hooks/useCurrentDataSubmissionId";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { Future } from "../../../domain/entities/Future";
import { ImportSummary } from "../../../domain/entities/data-entry/ImportSummary";
import { StyledLoaderContainer } from "./ConsistencyChecks";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";

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
}) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const [isValidated, setIsValidated] = useState(false);
    const [isFileValid, setIsFileValid] = useState(false);
    const [previousUploadsBatchIds, setPreviousUploadsBatchIds] = useState<string[]>([]);
    const [hasSecondaryFile, setHasSecondaryFile] = useState<boolean>(false);
    const [importLoading, setImportLoading] = useState<boolean>(false);
    const [previousBatchIdsLoading, setPreviousBatchIdsLoading] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);

    const {
        currentModuleAccess: { moduleId, moduleName },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { orgUnitId, orgUnitCode },
    } = useCurrentOrgUnitContext();

    const { currentPeriod } = useCurrentPeriodContext();
    const dataSubmissionId = useCurrentDataSubmissionId(compositionRoot, moduleId, orgUnitId, currentPeriod);

    useEffect(() => {
        if (moduleProperties.get(moduleName)?.isbatchReq) {
            setPreviousBatchIdsLoading(true);
            if (dataSubmissionId !== "") {
                compositionRoot.glassUploads.getByDataSubmission(dataSubmissionId).run(
                    uploads => {
                        const uniquePreviousBatchIds = [
                            ...new Set(
                                uploads
                                    .filter(upload => upload.status.toLowerCase() !== UPLOADED_STATUS)
                                    .map(upload => upload.batchId)
                            ),
                        ];
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
            }
        } else {
            setPreviousBatchIdsLoading(false);
        }
    }, [compositionRoot.glassUploads, dataSubmissionId, setBatchId, snackbar, moduleName]);

    useEffect(() => {
        if (moduleProperties.get(moduleName)?.isbatchReq) {
            if (batchId && isFileValid) {
                setIsValidated(true);
            } else {
                setIsValidated(false);
            }
        } else {
            if (isFileValid) setIsValidated(true);
        }
    }, [batchId, isFileValid, moduleName]);

    const changeBatchId = async (event: React.ChangeEvent<{ value: unknown }>) => {
        const batchId = event.target.value as string;
        const primaryUploadId = localStorage.getItem("primaryUploadId");
        const secondaryUploadId = localStorage.getItem("secondaryUploadId");
        setBatchId(batchId);

        if (primaryUploadId) {
            await compositionRoot.glassUploads.setBatchId({ id: primaryUploadId, batchId }).toPromise();
        }
        if (secondaryUploadId) {
            await compositionRoot.glassUploads.setBatchId({ id: secondaryUploadId, batchId }).toPromise();
        }
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
                    orgUnitCode,
                    true,
                    ""
                ),
                importSecondaryFileSummary: secondaryFile
                    ? compositionRoot.fileSubmission.secondaryFile(
                          secondaryFile,
                          batchId,
                          currentPeriod,
                          "CREATE_AND_UPDATE",
                          orgUnitId,
                          orgUnitCode,
                          true
                      )
                    : Future.success(undefined),
            }).run(
                ({ importPrimaryFileSummary, importSecondaryFileSummary }) => {
                    setPrimaryFileImportSummary(importPrimaryFileSummary);

                    if (importSecondaryFileSummary) {
                        setSecondaryFileImportSummary(importSecondaryFileSummary);
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
        batchId,
        compositionRoot.fileSubmission,
        moduleName,
        orgUnitCode,
        orgUnitId,
        currentPeriod,
        primaryFile,
        secondaryFile,
        setPrimaryFileImportSummary,
        setSecondaryFileImportSummary,
        changeStep,
    ]);

    const continueClick = () => {
        if (!hasSecondaryFile) {
            localStorage.removeItem("secondaryUploadId");
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
        compositionRoot.fileSubmission.downloadEmptyTemplate(orgUnitId).run(
            file => {
                const fileName = "AMR_GLASS_EGASP_PRE_INPUT_FILES.xlsx";

                //download file automatically
                const downloadSimulateAnchor = document.createElement("a");
                downloadSimulateAnchor.href = URL.createObjectURL(file);
                downloadSimulateAnchor.download = fileName;
                // simulate link click
                document.body.appendChild(downloadSimulateAnchor);
                downloadSimulateAnchor.click();
                setLoading(false);
            },
            error => {
                snackbar.error("Error downloading file");
                console.error(error);
                setLoading(false);
            }
        );
    }, [compositionRoot.fileSubmission, snackbar, orgUnitId]);

    return (
        <ContentWrapper>
            <Backdrop open={loading} style={{ color: "#fff", zIndex: 1 }}>
                <StyledLoaderContainer>
                    <CircularProgress color="inherit" size={50} />
                    <Typography variant="h6">{i18n.t("Downloading")}</Typography>
                </StyledLoaderContainer>
            </Backdrop>

            <Backdrop open={importLoading} style={{ color: "#fff", zIndex: 1 }}>
                <StyledLoaderContainer>
                    <CircularProgress color="inherit" size={50} />

                    <Typography variant="h6">
                        {i18n.t(moduleProperties.get(moduleName)?.importLoadingMsg.line1 || "Loading")}
                    </Typography>

                    <Typography variant="h5">
                        {i18n.t(moduleProperties.get(moduleName)?.importLoadingMsg.line2 || "")}
                    </Typography>
                </StyledLoaderContainer>
            </Backdrop>
            {previousBatchIdsLoading ? (
                <CircularProgress size={25} />
            ) : (
                <>
                    <div className="file-fields">
                        <UploadPrimaryFile
                            validate={setIsFileValid}
                            batchId={batchId}
                            primaryFile={primaryFile}
                            setPrimaryFile={setPrimaryFile}
                        />
                        {moduleProperties.get(moduleName)?.isbatchReq && (
                            <UploadSample
                                batchId={batchId}
                                sampleFile={secondaryFile}
                                setSampleFile={setSecondaryFile}
                                setHasSampleFile={setHasSecondaryFile}
                            />
                        )}
                    </div>
                    {moduleProperties.get(moduleName)?.isbatchReq && (
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
                                        <MenuItem
                                            key={value}
                                            value={value}
                                            disabled={previousUploadsBatchIds.includes(value)}
                                        >
                                            {i18n.t(label)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </div>
                    )}
                    <BottomContainer>
                        {previousUploadsBatchIds.length > 0 && moduleProperties.get(moduleName)?.isbatchReq ? (
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
                            <Button variant="outlined" color="primary" disableElevation onClick={downloadEmptyTemplate}>
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
                </>
            )}
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
