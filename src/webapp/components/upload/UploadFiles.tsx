import React, { useEffect, useState } from "react";
import { Button, FormControl, InputLabel, MenuItem, Select } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { UploadRis } from "./UploadRis";
import { UploadSample } from "./UploadSample";
import { useAppContext } from "../../contexts/app-context";
import { GlassUploads } from "../../../domain/entities/GlassUploads";
import { useCurrentDataSubmissionId } from "../../hooks/useCurrentDataSubmissionId";
import { useLocation } from "react-router-dom";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";

interface UploadFilesProps {
    changeStep: (step: number) => void;
    risFile: File | null;
    setRisFile: React.Dispatch<React.SetStateAction<File | null>>;
    sampleFile: File | null;
    setSampleFile: React.Dispatch<React.SetStateAction<File | null>>;
}

const datasetOptions = [
    {
        label: "Dataset 1",
        value: "1",
    },
    {
        label: "Dataset 2",
        value: "2",
    },
    {
        label: "Dataset 3",
        value: "3",
    },
    {
        label: "Dataset 4",
        value: "4",
    },
    {
        label: "Dataset 5",
        value: "5",
    },
    {
        label: "Dataset 6",
        value: "6",
    },
];

export const UploadFiles: React.FC<UploadFilesProps> = ({
    changeStep,
    risFile,
    setRisFile,
    sampleFile,
    setSampleFile,
}) => {
    const { compositionRoot } = useAppContext();
    const location = useLocation();

    const [batchId, setBatchId] = useState("");
    const [isValidated, setIsValidated] = useState(false);
    const [isFileValid, setIsFileValid] = useState(false);
    const [previousUploads, setPreviousGlassUploads] = useState<GlassUploads[]>([]);
    const [previousUploadsBatchIds, setPreviousUploadsBatchIds] = useState<string[]>([]);

    const {
        currentModuleAccess: { moduleId },
    } = useCurrentModuleContext();
    const {
        currentOrgUnitAccess: { orgUnitId },
    } = useCurrentOrgUnitContext();

    const queryParameters = new URLSearchParams(location.search);
    const period = queryParameters.get("period") || (new Date().getFullYear() - 1).toString();
    const dataSubmissionId = useCurrentDataSubmissionId(compositionRoot, moduleId, orgUnitId, parseInt(period));

    useEffect(() => {
        const fetchPreviousUpload = async (): Promise<GlassUploads[]> => {
            return await compositionRoot.glassUploads.getByDataSubmission(dataSubmissionId).toPromise();
        };

        fetchPreviousUpload().then(uploads => setPreviousGlassUploads(uploads));
    }, [compositionRoot.glassUploads, dataSubmissionId]);

    useEffect(() => {
        if (batchId && isFileValid) {
            setIsValidated(true);
        } else {
            setIsValidated(false);
        }
    }, [batchId, isFileValid]);

    useEffect(() => {
        const uniqueBatchIds = [...new Set(previousUploads.map(uploads => uploads.batchId))];
        setPreviousUploadsBatchIds(uniqueBatchIds);
        const firstSelectableBatchId = datasetOptions.find(({ value }) => !uniqueBatchIds.includes(value))?.value;
        setBatchId(firstSelectableBatchId || "");
    }, [previousUploads]);

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

    return (
        <ContentWrapper>
            <div className="file-fields">
                <UploadRis validate={setIsFileValid} batchId={batchId} risFile={risFile} setRisFile={setRisFile} />

                <UploadSample batchId={batchId} sampleFile={sampleFile} setSampleFile={setSampleFile} />
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
                    >
                        {datasetOptions.map(({ label, value }) => (
                            <MenuItem key={value} value={value} disabled={previousUploadsBatchIds.includes(value)}>
                                {i18n.t(label)}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </div>

            <div className="bottom">
                {previousUploads.length !== 0 && (
                    <div className="previous-list">
                        <h4>{i18n.t("You Previously Submitted:")} </h4>
                        <ul>
                            {previousUploadsBatchIds.map(batchId => (
                                <li key={batchId}>{`Batch Id ${batchId}`}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <Button
                    variant="contained"
                    color={isValidated ? "primary" : "default"}
                    disabled={isValidated ? false : true}
                    endIcon={<ChevronRightIcon />}
                    disableElevation
                    onClick={() => changeStep(2)}
                >
                    {i18n.t("Continue")}
                </Button>
            </div>
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
