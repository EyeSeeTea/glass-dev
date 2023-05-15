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
    const [risFile, setRisFile] = useState<File | null>(null);
    const [sampleFile, setSampleFile] = useState<File | null>(null);
    const [risFileImportSummary, setRISFileImportSummary] = useState<ImportSummary | undefined>(undefined);
    const [sampleFileImportSummary, setSampleImportSummary] = useState<ImportSummary | undefined>(undefined);

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
            setRisFile(null);
            setSampleFile(null);
            setRISFileImportSummary(undefined);
            setSampleImportSummary(undefined);
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
                    risFile,
                    setRisFile,
                    sampleFile,
                    setSampleFile,
                    risFileImportSummary,
                    sampleFileImportSummary,
                    setRISFileImportSummary,
                    setSampleImportSummary
                )}
        </ContentWrapper>
    );
};

const renderStep = (
    step: number,
    changeStep: any,
    batchId: string,
    setBatchId: React.Dispatch<React.SetStateAction<string>>,
    risFile: File | null,
    setRisFile: React.Dispatch<React.SetStateAction<File | null>>,
    sampleFile: File | null,
    setSampleFile: React.Dispatch<React.SetStateAction<File | null>>,
    risFileImportSummary: ImportSummary | undefined,
    sampleFileImportSummary: ImportSummary | undefined,
    setRISFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>,
    setSampleFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>
) => {
    switch (step) {
        case 1:
            return (
                <UploadFiles
                    changeStep={changeStep}
                    batchId={batchId}
                    setBatchId={setBatchId}
                    risFile={risFile}
                    setRisFile={setRisFile}
                    sampleFile={sampleFile}
                    setSampleFile={setSampleFile}
                    setRISFileImportSummary={setRISFileImportSummary}
                    setSampleFileImportSummary={setSampleFileImportSummary}
                />
            );
        case 2:
            return (
                <>
                    <ConsistencyChecks
                        changeStep={changeStep}
                        batchId={batchId}
                        risFile={risFile}
                        sampleFile={sampleFile}
                        risFileImportSummary={risFileImportSummary}
                        sampleFileImportSummary={sampleFileImportSummary}
                        setRISFileImportSummary={setRISFileImportSummary}
                        setSampleFileImportSummary={setSampleFileImportSummary}
                    />
                </>
            );
        case 3:
            return (
                <ReviewDataSummary
                    changeStep={changeStep}
                    risFileImportSummary={risFileImportSummary}
                    sampleFileImportSummary={sampleFileImportSummary}
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
