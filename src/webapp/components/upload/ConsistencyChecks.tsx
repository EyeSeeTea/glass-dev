import React, { useEffect, useState } from "react";
import { Button, CircularProgress } from "@material-ui/core";
import { BlockingErrors } from "./BlockingErrors";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { NonBlockingWarnings } from "./NonBlockingWarnings";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { DataValuesSaveSummary } from "../../../domain/entities/data-entry/DataValuesSaveSummary";

interface ConsistencyChecksProps {
    changeStep: (step: number) => void;
    risFile: File | null;
}

const COMPLETED_STATUS = "COMPLETED";

export type ErrorCount = {
    error: string;
    count: number;
};

export const ConsistencyChecks: React.FC<ConsistencyChecksProps> = ({ changeStep, risFile }) => {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const [fileType, setFileType] = useState<string>("ris");
    const [isDataSetUploading, setIsDataSetUploading] = useState<boolean>(false);
    const [blockingErrors, setBlockingErrors] = useState<ErrorCount[]>([]);
    const [nonBlockingErrors, setNonBlockingErrors] = useState<ErrorCount[]>([]);

    const updateErrorCounts = (errors: ErrorCount[], datasetImportStatus: DataValuesSaveSummary) => {
        const updatedNonBLockingErrors = datasetImportStatus.conflicts?.map(status => {
            const existingError = errors.filter(nbe => nbe.error === status.value);
            //Add only unique errors, so only one of each kind of error will exist in array
            if (existingError[0]) {
                return {
                    error: existingError[0]?.error,
                    count: existingError[0]?.count + 1,
                };
            } else {
                return {
                    error: status.value,
                    count: 1,
                };
            }
        });

        if (updatedNonBLockingErrors) {
            const uniqueErrors = errors.filter(nbe => updatedNonBLockingErrors.every(e => e.error !== nbe.error));
            return [...uniqueErrors, ...updatedNonBLockingErrors];
        } else {
            return [...errors];
        }
    };
    useEffect(() => {
        function uploadDatasets() {
            if (risFile && currentModuleAccess.moduleName === "AMR") {
                setIsDataSetUploading(true);

                compositionRoot.glassRisFile.importFile(risFile).run(
                    datasetImportStatus => {
                        debugger;
                        //Warning considered non-blocking
                        if (datasetImportStatus.status === "WARNING") {
                            if (datasetImportStatus.conflicts && datasetImportStatus.conflicts.length) {
                                setNonBlockingErrors(prev => {
                                    return updateErrorCounts(prev, datasetImportStatus);
                                });
                            }
                        }

                        //Errors considered blocking
                        else if (datasetImportStatus.status === "ERROR") {
                            if (datasetImportStatus.conflicts && datasetImportStatus.conflicts.length) {
                                setBlockingErrors(prev => {
                                    return updateErrorCounts(prev, datasetImportStatus);
                                });
                            }
                        }
                        //consider any ignored imports as blocking error.
                        if (datasetImportStatus.importCount.ignored > 0) {
                            setBlockingErrors(blockingErrors => {
                                const ignoredError = blockingErrors.filter(be => be.error === "Import Ignored");
                                if (ignoredError[0]) {
                                    return [
                                        ...blockingErrors.filter(be => be.error !== "Import Ignored"),
                                        {
                                            error: ignoredError[0].error,
                                            count: ignoredError[0].count + datasetImportStatus.importCount.ignored,
                                        },
                                    ];
                                } else {
                                    return [
                                        ...blockingErrors,
                                        {
                                            error: "Import Ignored",
                                            count: datasetImportStatus.importCount.ignored,
                                        },
                                    ];
                                }
                            });
                        }

                        setIsDataSetUploading(false);
                    },
                    error => {
                        debugger;
                        setBlockingErrors(blockingErrors => {
                            return [...blockingErrors, { error: error, count: 1 }];
                        });
                        setIsDataSetUploading(false);
                    }
                );
            }
        }

        uploadDatasets();
    }, [compositionRoot.glassRisFile, currentModuleAccess.moduleName, risFile]);

    const changeType = (fileType: string) => {
        setFileType(fileType);
    };

    const goToFinalStep = async () => {
        const risUploadId = localStorage.getItem("risUploadId");
        const sampleUploadId = localStorage.getItem("sampleUploadId");
        if (risUploadId) {
            await compositionRoot.glassUploads.setStatus({ id: risUploadId, status: COMPLETED_STATUS }).toPromise();
        }
        if (sampleUploadId) {
            await compositionRoot.glassUploads.setStatus({ id: sampleUploadId, status: COMPLETED_STATUS }).toPromise();
        }
        changeStep(3);
    };

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
                {renderTypeContent(fileType, blockingErrors, nonBlockingErrors)}
                <div className="bottom">
                    <Button
                        variant="contained"
                        color="primary"
                        endIcon={<ChevronRightIcon />}
                        onClick={goToFinalStep}
                        disableElevation
                        disabled={blockingErrors.length ? true : false}
                    >
                        {i18n.t("Continue")}
                    </Button>
                </div>
            </ContentWrapper>
        );
};

const renderTypeContent = (type: string, blockingErrors: ErrorCount[], warningErrors: ErrorCount[]) => {
    switch (type) {
        case "sample":
            return <p>{i18n.t("Sample file uploading content/intructions here...")}</p>;
        default:
            return (
                <>
                    {blockingErrors && <BlockingErrors rows={blockingErrors} />}
                    {warningErrors && <NonBlockingWarnings rows={warningErrors} />}
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
