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

interface ConsistencyChecksProps {
    changeStep: (step: number) => void;
    risFile: File | null;
}

const COMPLETED_STATUS = "COMPLETED";

export const ConsistencyChecks: React.FC<ConsistencyChecksProps> = ({ changeStep, risFile }) => {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const [fileType, setFileType] = useState<string>("ris");
    const [isDataSetUploading, setIsDataSetUploading] = useState<boolean>(false);
    const [blockingErrors, setBlockingErrors] = useState<Map<string, number>>(new Map<string, number>());
    const [warningErrors, setWarningErrors] = useState<Map<string, number>>(new Map<string, number>());

    useEffect(() => {
        async function uploadDatasets() {
            if (risFile && currentModuleAccess.moduleName === "AMR") {
                setIsDataSetUploading(true);
                await compositionRoot.glassRisFile.importFile(risFile).then(responses => {
                    responses?.forEach((response, index) => {
                        response.run(
                            importStatus => {
                                if (importStatus.status === "WARNING") {
                                    setWarningErrors(prev => {
                                        const updated = prev;
                                        importStatus?.conflicts?.forEach(element => {
                                            const count = updated.get(element.value);
                                            if (count !== undefined && count >= 0) {
                                                updated.set(element.value, count + 1);
                                            } else {
                                                updated.set(element.value, 1);
                                            }
                                        });
                                        return updated;
                                    });
                                } else if (importStatus.status === "ERROR") {
                                    setBlockingErrors(prev => {
                                        const updated = prev;
                                        importStatus?.conflicts?.forEach(element => {
                                            const count = updated.get(element.value);
                                            if (count !== undefined && count >= 0) {
                                                updated.set(element.value, count + 1);
                                            } else {
                                                updated.set(element.value, 1);
                                            }
                                        });
                                        return updated;
                                    });
                                }
                                if (index === responses.length - 1) {
                                    setIsDataSetUploading(false);
                                }
                            },
                            _error => setIsDataSetUploading(false)
                        );
                    });
                });
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
                {renderTypeContent(fileType, blockingErrors, warningErrors)}
                <div className="bottom">
                    <Button
                        variant="contained"
                        color="primary"
                        endIcon={<ChevronRightIcon />}
                        onClick={goToFinalStep}
                        disableElevation
                    >
                        {i18n.t("Continue")}
                    </Button>
                </div>
            </ContentWrapper>
        );
};

const renderTypeContent = (
    type: string,
    blockingErrors: Map<string, number> | undefined,
    warningErrors: Map<string, number> | undefined
) => {
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
