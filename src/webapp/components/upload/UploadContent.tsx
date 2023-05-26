import React, { useEffect, useState } from "react";
import { UploadNav } from "./UploadNav";
import { useUploadSteps } from "../../hooks/useUploadSteps";
import { ConsistencyChecks } from "./ConsistencyChecks";
import styled from "styled-components";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import { UploadFiles } from "./UploadFiles";
import { ReviewDataSummary } from "./ReviewDataSummary";
import { Completed } from "./Completed";
import { ImportSummary } from "../../../domain/entities/data-entry/ImportSummary";

interface UploadContentProps {
    resetWizard: boolean;
    setResetWizard: React.Dispatch<React.SetStateAction<boolean>>;
}
export const UploadContent: React.FC<UploadContentProps> = ({ resetWizard, setResetWizard }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [batchId, setBatchId] = useState<string>("");
    const [primaryFile, setPrimaryFile] = useState<File | null>(null);
    const [secondaryFile, setSecondaryFile] = useState<File | null>(null);
    const [primaryFileImportSummary, setPrimaryFileImportSummary] = useState<ImportSummary | undefined>(undefined);
    const [secondaryFileImportSummary, setSecondaryImportSummary] = useState<ImportSummary | undefined>(undefined);

    const changeStep = (step: number) => {
        setCurrentStep(step);
        if (!completedSteps.includes(step - 1)) {
            setCompletedSteps([...completedSteps, step - 1]);
        }
    };

    const steps = useUploadSteps();

    useEffect(() => {
        if (resetWizard) {
            setCurrentStep(1);
            setCompletedSteps([]);
            setBatchId("");
            setPrimaryFile(null);
            setSecondaryFile(null);
            setPrimaryFileImportSummary(undefined);
            setSecondaryImportSummary(undefined);
            setResetWizard(false);
        }
    }, [resetWizard, setResetWizard]);

    return (
        <ContentWrapper>
            <UploadNav
                steps={steps}
                currentStep={currentStep}
                changeStep={changeStep}
                completedSteps={completedSteps}
            />
            {steps.length &&
                renderStep(
                    currentStep,
                    changeStep,
                    batchId,
                    setBatchId,
                    primaryFile,
                    setPrimaryFile,
                    secondaryFile,
                    setSecondaryFile,
                    primaryFileImportSummary,
                    secondaryFileImportSummary,
                    setPrimaryFileImportSummary,
                    setSecondaryImportSummary
                )}
        </ContentWrapper>
    );
};

const renderStep = (
    step: number,
    changeStep: any,
    batchId: string,
    setBatchId: React.Dispatch<React.SetStateAction<string>>,
    primaryFile: File | null,
    setPrimaryFile: React.Dispatch<React.SetStateAction<File | null>>,
    secondaryFile: File | null,
    setSecondaryFile: React.Dispatch<React.SetStateAction<File | null>>,
    primaryFileImportSummary: ImportSummary | undefined,
    secondaryFileImportSummary: ImportSummary | undefined,
    setPrimaryFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>,
    setSecondaryFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>
) => {
    switch (step) {
        case 1:
            return (
                <UploadFiles
                    changeStep={changeStep}
                    batchId={batchId}
                    setBatchId={setBatchId}
                    primaryFile={primaryFile}
                    setPrimaryFile={setPrimaryFile}
                    secondaryFile={secondaryFile}
                    setSecondaryFile={setSecondaryFile}
                    setPrimaryFileImportSummary={setPrimaryFileImportSummary}
                    setSecondaryFileImportSummary={setSecondaryFileImportSummary}
                />
            );
        case 2:
            return (
                <>
                    <ConsistencyChecks
                        changeStep={changeStep}
                        batchId={batchId}
                        primaryFile={primaryFile}
                        secondaryFile={secondaryFile}
                        primaryFileImportSummary={primaryFileImportSummary}
                        secondaryFileImportSummary={secondaryFileImportSummary}
                        setPrimaryFileImportSummary={setPrimaryFileImportSummary}
                        setSecondaryFileImportSummary={setSecondaryFileImportSummary}
                    />
                </>
            );
        case 3:
            return (
                <ReviewDataSummary
                    changeStep={changeStep}
                    primaryFileImportSummary={primaryFileImportSummary}
                    secondaryFileImportSummary={secondaryFileImportSummary}
                />
            );
        case 4:
            return <Completed />;
        default:
            break;
    }
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
    p.intro {
        text-align: left;
        max-width: 730px;
        margin: 0 auto;
        font-weight: 300px;
        line-height: 1.4;
    }
    h3 {
        font-size: 21px;
        color: ${palette.text.primary};
    }
    .MuiTableContainer-root {
        border: none;
        box-shadow: none;
    }
    .MuiTableRow-head {
        border-bottom: 3px solid ${glassColors.greyLight};
        th {
            color: ${glassColors.grey};
            font-weight: 400;
            font-size: 15px;
        }
    }
    .MuiTableBody-root {
        tr {
            border: none;
            td {
                border-bottom: 1px solid ${glassColors.greyLight};
            }
            td:nth-child(1) {
                color: ${glassColors.red};
            }
            td:nth-child(3) {
                width: 40px;
                text-align: center;
                opacity: 0.4;
                &:hover {
                    opacity: 1;
                }
            }
        }
    }
`;
