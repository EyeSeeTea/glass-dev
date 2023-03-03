import React, { useCallback, useEffect, useState } from "react";
import { Button, CircularProgress } from "@material-ui/core";
import { BlockingErrors } from "./BlockingErrors";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { NonBlockingWarnings } from "./NonBlockingWarnings";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { Future } from "../../../domain/entities/Future";

import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { useCallbackEffect } from "../../hooks/use-callback-effect";
interface ConsistencyChecksProps {
    changeStep: (step: number) => void;
    risFile: File | null;
    sampleFile?: File | null;
}

const COMPLETED_STATUS = "COMPLETED";

export type FileErrors = {
    nonBlockingErrors: ErrorCount[];
    blockingErrors: ErrorCount[];
};

export type ErrorCount = {
    error: string;
    count: number;
};

export const ConsistencyChecks: React.FC<ConsistencyChecksProps> = ({ changeStep, risFile, sampleFile }) => {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const snackbar = useSnackbar();
    const [fileType, setFileType] = useState<string>("ris");
    const [isDataSetUploading, setIsDataSetUploading] = useState<boolean>(false);
    const [risFileErrors, setRISErrors] = useState<FileErrors>({ nonBlockingErrors: [], blockingErrors: [] });
    const [sampleFileErrors, setSampleErrors] = useState<FileErrors | undefined>(undefined);

    useEffect(() => {
        function uploadDatasets() {
            if (risFile && currentModuleAccess.moduleName === "AMR") {
                setIsDataSetUploading(true);

                Future.joinObj({
                    importRISFileSummary: compositionRoot.dataSubmision.RISFile(risFile),
                    importSampleFileSummary: sampleFile
                        ? compositionRoot.dataSubmision.sampleFile(sampleFile)
                        : Future.success(undefined),
                }).run(
                    ({ importRISFileSummary, importSampleFileSummary }) => {
                        /* eslint-disable no-console */
                        console.log({ importRISFileSummary });
                        console.log({ importSampleFileSummary });

                        setRISErrors(importRISFileSummary);

                        if (importSampleFileSummary) {
                            setSampleErrors(importSampleFileSummary);
                        }

                        setIsDataSetUploading(false);
                    },
                    error => {
                        setRISErrors({ nonBlockingErrors: [], blockingErrors: [{ error: error, count: 1 }] });

                        setIsDataSetUploading(false);
                    }
                );
            }
        }

        uploadDatasets();
    }, [compositionRoot.dataSubmision, currentModuleAccess.moduleName, risFile, sampleFile]);

    const changeType = (fileType: string) => {
        setFileType(fileType);
    };

    const goToFinalStep = useCallback(() => {
        const risUploadId = localStorage.getItem("risUploadId");
        const sampleUploadId = localStorage.getItem("sampleUploadId");
        if (risUploadId) {
            return compositionRoot.glassUploads.setStatus({ id: risUploadId, status: COMPLETED_STATUS }).run(
                () => {
                    if (!sampleUploadId) {
                        changeStep(3);
                    }
                },
                errorMessage => {
                    snackbar.error(i18n.t(errorMessage));
                }
            );
        }
        if (sampleUploadId) {
            return compositionRoot.glassUploads.setStatus({ id: sampleUploadId, status: COMPLETED_STATUS }).run(
                () => {
                    changeStep(3);
                },
                errorMessage => {
                    snackbar.error(i18n.t(errorMessage));
                }
            );
        }
    }, [changeStep, compositionRoot.glassUploads, snackbar]);

    const goToFinalStepEffect = useCallbackEffect(goToFinalStep);

    if (isDataSetUploading) return <CircularProgress size={25} />;
    else
        return (
            <ContentWrapper>
                <p className="intro">
                    {i18n.t(
                        "Explaining what consistency checks are: Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed doeiusmod tempor incididunt ut labore"
                    )}
                </p>
                <div className="toggles">
                    <Button onClick={() => changeType("ris")} className={fileType === "ris" ? "current" : ""}>
                        {i18n.t("RIS File")}
                    </Button>
                    <Button onClick={() => changeType("sample")} className={fileType === "sample" ? "current" : ""}>
                        {i18n.t("Sample File")}
                    </Button>
                </div>
                {renderTypeContent(fileType, risFileErrors, sampleFileErrors)}
                <div className="bottom">
                    <Button
                        variant="contained"
                        color="primary"
                        endIcon={<ChevronRightIcon />}
                        onClick={goToFinalStepEffect}
                        disableElevation
                        disabled={risFileErrors.blockingErrors.length ? true : false}
                    >
                        {i18n.t("Continue")}
                    </Button>
                </div>
            </ContentWrapper>
        );
};

const renderTypeContent = (type: string, risfileErrors: FileErrors, samplefileErrors?: FileErrors) => {
    switch (type) {
        case "sample":
            return samplefileErrors ? (
                <>
                    {samplefileErrors.blockingErrors && <BlockingErrors rows={samplefileErrors.blockingErrors} />}
                    {samplefileErrors.nonBlockingErrors && (
                        <NonBlockingWarnings rows={samplefileErrors.nonBlockingErrors} />
                    )}
                </>
            ) : (
                <p>{i18n.t("No sample file uploaded")}</p>
            );
        default:
            return (
                <>
                    {risfileErrors.blockingErrors && <BlockingErrors rows={risfileErrors.blockingErrors} />}
                    {risfileErrors.nonBlockingErrors && <NonBlockingWarnings rows={risfileErrors.nonBlockingErrors} />}
                </>
            );
    }
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
    .toggles {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0;
        width: 100%;
        max-width: 550px;
        margin: 0 auto;
        button {
            color: ${glassColors.greyDisabled};
            padding: 10px 20px;
            border-radius: 0;
            border: none;
            flex: 1;
            border-bottom: 2px solid ${glassColors.greyLight};
            &.current {
                color: ${glassColors.mainPrimary};
                border-bottom: 4px solid ${glassColors.mainPrimary};
            }
        }
    }
`;
