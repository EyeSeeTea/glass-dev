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
import { useUploadContent } from "./useUploadContent";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { EffectFn } from "../../hooks/use-callback-effect";
import { Maybe } from "../../../utils/ts-utils";

interface UploadContentProps {
    resetWizard: boolean;
    setResetWizard: React.Dispatch<React.SetStateAction<boolean>>;
}
export const UploadContent: React.FC<UploadContentProps> = ({ resetWizard, setResetWizard }) => {
    const {
        errorMessage,
        isLoadingPrimary,
        setIsLoadingPrimary,
        isLoadingSecondary,
        setIsLoadingSecondary,
        primaryFile,
        setPrimaryFile,
        removePrimaryFile,
        secondaryFile,
        setSecondaryFile,
        removeSecondaryFile,
        hasSecondaryFile,
        setHasSecondaryFile,
        dataSubmissionId,
        isRunningCalculation,
        setIsRunningCalculation,
        setPrimaryFileTotalRows,
        primaryFileTotalRows,
        setSecondaryFileTotalRows,
        secondaryFileTotalRows,
    } = useUploadContent();
    const snackbar = useSnackbar();

    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);
    const [batchId, setBatchId] = useState<string>("");
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
    }, [resetWizard, setPrimaryFile, setResetWizard, setSecondaryFile]);

    useEffect(() => {
        if (errorMessage) {
            snackbar.error(errorMessage);
        }
    }, [errorMessage, snackbar]);

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
                    setSecondaryImportSummary,
                    removePrimaryFile,
                    removeSecondaryFile,
                    hasSecondaryFile,
                    setHasSecondaryFile,
                    isLoadingPrimary,
                    setIsLoadingPrimary,
                    isLoadingSecondary,
                    setIsLoadingSecondary,
                    dataSubmissionId,
                    isRunningCalculation,
                    setIsRunningCalculation,
                    setPrimaryFileTotalRows,
                    primaryFileTotalRows,
                    setSecondaryFileTotalRows,
                    secondaryFileTotalRows
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
    setSecondaryFile: (maybeFile: File | null) => void,
    primaryFileImportSummary: ImportSummary | undefined,
    secondaryFileImportSummary: ImportSummary | undefined,
    setPrimaryFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>,
    setSecondaryFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>,
    removePrimaryFile: EffectFn<[event: React.MouseEvent<HTMLButtonElement, MouseEvent>]>,
    removeSecondaryFile: EffectFn<[event: React.MouseEvent<HTMLButtonElement, MouseEvent>]>,
    hasSecondaryFile: boolean,
    setHasSecondaryFile: React.Dispatch<React.SetStateAction<boolean>>,
    isLoadingPrimary: boolean,
    setIsLoadingPrimary: React.Dispatch<React.SetStateAction<boolean>>,
    isLoadingSecondary: boolean,
    setIsLoadingSecondary: React.Dispatch<React.SetStateAction<boolean>>,
    dataSubmissionId: string | undefined,
    isRunningCalculation: boolean,
    setIsRunningCalculation: React.Dispatch<React.SetStateAction<boolean>>,
    setPrimaryFileTotalRows: React.Dispatch<React.SetStateAction<Maybe<number>>>,
    primaryFileTotalRows: Maybe<number>,
    setSecondaryFileTotalRows: React.Dispatch<React.SetStateAction<Maybe<number>>>,
    secondaryFileTotalRows: Maybe<number>
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
                    removePrimaryFile={removePrimaryFile}
                    removeSecondaryFile={removeSecondaryFile}
                    hasSecondaryFile={hasSecondaryFile}
                    setHasSecondaryFile={setHasSecondaryFile}
                    isLoadingPrimary={isLoadingPrimary}
                    setIsLoadingPrimary={setIsLoadingPrimary}
                    isLoadingSecondary={isLoadingSecondary}
                    setIsLoadingSecondary={setIsLoadingSecondary}
                    dataSubmissionId={dataSubmissionId}
                    setPrimaryFileTotalRows={setPrimaryFileTotalRows}
                    primaryFileTotalRows={primaryFileTotalRows}
                    setSecondaryFileTotalRows={setSecondaryFileTotalRows}
                    secondaryFileTotalRows={secondaryFileTotalRows}
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
                        setIsRunningCalculation={setIsRunningCalculation}
                    />
                </>
            );
        case 3:
            return (
                <ReviewDataSummary
                    changeStep={changeStep}
                    primaryFileImportSummary={primaryFileImportSummary}
                    secondaryFileImportSummary={secondaryFileImportSummary}
                    isRunningCalculation={isRunningCalculation}
                    primaryFile={primaryFile}
                    secondaryFile={secondaryFile}
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
