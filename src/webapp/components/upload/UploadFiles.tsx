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
import { UploadRis } from "./UploadRis";
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

interface UploadFilesProps {
    changeStep: (step: number) => void;
    risFile: File | null;
    setRisFile: React.Dispatch<React.SetStateAction<File | null>>;
    sampleFile: File | null;
    setSampleFile: React.Dispatch<React.SetStateAction<File | null>>;
    batchId: string;
    setBatchId: React.Dispatch<React.SetStateAction<string>>;
    setRISFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>;
    setSampleFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>;
}

interface PreviouslySubmittedContainerProps {
    isVisible: boolean;
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
    risFile,
    setRisFile,
    sampleFile,
    setSampleFile,
    batchId,
    setBatchId,
    setRISFileImportSummary,
    setSampleFileImportSummary,
}) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const [isValidated, setIsValidated] = useState(false);
    const [isFileValid, setIsFileValid] = useState(false);
    const [previousUploadsBatchIds, setPreviousUploadsBatchIds] = useState<string[]>([]);
    const [hasSampleFile, setHasSampleFile] = useState<boolean>(false);
    const [importLoading, setImportLoading] = useState<boolean>(false);
    const [previousBatchIdsLoading, setPreviousBatchIdsLoading] = useState<boolean>(true);

    const {
        currentModuleAccess: { moduleId, moduleName },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { orgUnitId, orgUnitCode },
    } = useCurrentOrgUnitContext();

    const { currentPeriod } = useCurrentPeriodContext();
    const dataSubmissionId = useCurrentDataSubmissionId(compositionRoot, moduleId, orgUnitId, currentPeriod);

    useEffect(() => {
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
    }, [compositionRoot.glassUploads, dataSubmissionId, setBatchId, snackbar]);

    useEffect(() => {
        if (batchId && isFileValid) {
            setIsValidated(true);
        } else {
            setIsValidated(false);
        }
    }, [batchId, isFileValid]);

    const changeBatchId = async (event: React.ChangeEvent<{ value: unknown }>) => {
        const batchId = event.target.value as string;
        const risUploadId = localStorage.getItem("risUploadId");
        const sampleUploadId = localStorage.getItem("sampleUploadId");
        setBatchId(batchId);

        if (risUploadId) {
            await compositionRoot.glassUploads.setBatchId({ id: risUploadId, batchId }).toPromise();
        }
        if (sampleUploadId) {
            await compositionRoot.glassUploads.setBatchId({ id: sampleUploadId, batchId }).toPromise();
        }
    };
    const uploadDatasetsAsDryRun = useCallback(() => {
        if (risFile && moduleName === "AMR") {
            setImportLoading(true);
            Future.joinObj({
                importRISFileSummary: compositionRoot.dataSubmision.RISFile(
                    risFile,
                    batchId,
                    currentPeriod,
                    "CREATE_AND_UPDATE",
                    orgUnitId,
                    orgUnitCode,
                    true
                ),
                importSampleFileSummary: sampleFile
                    ? compositionRoot.dataSubmision.sampleFile(
                          sampleFile,
                          batchId,
                          currentPeriod,
                          "CREATE_AND_UPDATE",
                          orgUnitId,
                          orgUnitCode,
                          true
                      )
                    : Future.success(undefined),
            }).run(
                ({ importRISFileSummary, importSampleFileSummary }) => {
                    setRISFileImportSummary(importRISFileSummary);

                    if (importSampleFileSummary) {
                        setSampleFileImportSummary(importSampleFileSummary);
                    }
                    setImportLoading(false);
                    changeStep(2);
                },
                error => {
                    setRISFileImportSummary({
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
        compositionRoot.dataSubmision,
        moduleName,
        orgUnitCode,
        orgUnitId,
        currentPeriod,
        risFile,
        sampleFile,
        setRISFileImportSummary,
        setSampleFileImportSummary,
        changeStep,
    ]);

    const continueClick = () => {
        if (!hasSampleFile) {
            localStorage.removeItem("sampleUploadId");
            uploadDatasetsAsDryRun();
        }
        //update the sample file with ris file upload id.
        else {
            setImportLoading(true);
            const risUploadId = localStorage.getItem("risUploadId");
            const sampleUploadId = localStorage.getItem("sampleUploadId");
            if (sampleUploadId && risUploadId)
                compositionRoot.glassDocuments.updateSampleFileWithRisId(sampleUploadId, risUploadId).run(
                    () => {
                        uploadDatasetsAsDryRun();
                    },
                    () => {
                        console.debug("Error updating datastore");
                    }
                );
        }
    };

    return (
        <ContentWrapper>
            <Backdrop open={importLoading} style={{ color: "#fff", zIndex: 1 }}>
                <StyledLoaderContainer>
                    <CircularProgress color="inherit" size={50} />
                    <Typography variant="h6">
                        {i18n.t("Performing a dry run of the import to ensure that there are no errors.")}
                    </Typography>
                    <Typography variant="h5">
                        {i18n.t("This might take several minutes, do not refresh the page or press back.")}
                    </Typography>
                </StyledLoaderContainer>
            </Backdrop>
            {previousBatchIdsLoading ? (
                <CircularProgress size={25} />
            ) : (
                <>
                    <div className="file-fields">
                        <UploadRis
                            validate={setIsFileValid}
                            batchId={batchId}
                            risFile={risFile}
                            setRisFile={setRisFile}
                        />

                        <UploadSample
                            batchId={batchId}
                            sampleFile={sampleFile}
                            setSampleFile={setSampleFile}
                            setHasSampleFile={setHasSampleFile}
                        />
                    </div>

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

                    <div className="bottom">
                        <PreviouslySubmittedContainer isVisible={previousUploadsBatchIds.length > 0}>
                            <h4>{i18n.t("You Previously Submitted:")} </h4>
                            <ul>
                                {previousUploadsBatchIds.map(batchId => (
                                    <li key={batchId}>{`Batch Id ${batchId}`}</li>
                                ))}
                            </ul>
                        </PreviouslySubmittedContainer>

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
                    </div>
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
    .bottom {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        justify-content: space-between;
        margin: 0 auto 30px auto;
        align-items: flex-end;
        width: 100%;
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

const PreviouslySubmittedContainer = styled.div<PreviouslySubmittedContainerProps>`
    ${props =>
        !props.isVisible && {
            visibility: "hidden",
        }}
`;
