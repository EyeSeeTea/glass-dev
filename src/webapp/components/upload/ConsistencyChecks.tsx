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
import { Future } from "../../../domain/entities/Future";
import { ImportSummary } from "../../../domain/entities/data-entry/ImportSummary";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";

interface ConsistencyChecksProps {
    changeStep: (step: number) => void;
    batchId: string;
    risFile: File | null;
    sampleFile?: File | null;
    setRISFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>;
    setSampleFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>;
}

export const ConsistencyChecks: React.FC<ConsistencyChecksProps> = ({
    changeStep,
    batchId,
    risFile,
    sampleFile,
    setRISFileImportSummary,
    setSampleFileImportSummary,
}) => {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const [fileType, setFileType] = useState<string>("ris");
    const [isDataSetUploading, setIsDataSetUploading] = useState<boolean>(false);
    const [risFileErrors, setRISErrors] = useState<ImportSummary | undefined>(undefined);
    const [sampleFileErrors, setSampleErrors] = useState<ImportSummary | undefined>(undefined);
    const { currentPeriod } = useCurrentPeriodContext();

    useEffect(() => {
        function uploadDatasets() {
            if (risFile && currentModuleAccess.moduleName === "AMR") {
                setIsDataSetUploading(true);

                Future.joinObj({
                    importRISFileSummary: compositionRoot.dataSubmision.RISFile(
                        risFile,
                        batchId,
                        currentPeriod,
                        "CREATE_AND_UPDATE"
                    ),
                    importSampleFileSummary: sampleFile
                        ? compositionRoot.dataSubmision.sampleFile(
                              sampleFile,
                              batchId,
                              currentPeriod,
                              "CREATE_AND_UPDATE"
                          )
                        : Future.success(undefined),
                }).run(
                    ({ importRISFileSummary, importSampleFileSummary }) => {
                        /* eslint-disable no-console */
                        console.log({ importRISFileSummary });
                        console.log({ importSampleFileSummary });

                        setRISErrors(importRISFileSummary);
                        setRISFileImportSummary(importRISFileSummary);

                        if (importSampleFileSummary) {
                            setSampleErrors(importSampleFileSummary);
                            setSampleFileImportSummary(importSampleFileSummary);
                        }

                        setIsDataSetUploading(false);
                    },
                    error => {
                        setRISErrors({
                            status: "ERROR",
                            importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
                            nonBlockingErrors: [],
                            blockingErrors: [{ error: error, count: 1 }],
                        });

                        setIsDataSetUploading(false);
                    }
                );
            }
        }

        uploadDatasets();
    }, [
        compositionRoot.dataSubmision,
        currentModuleAccess.moduleName,
        risFile,
        sampleFile,
        setRISFileImportSummary,
        setSampleFileImportSummary,
        batchId,
        currentPeriod,
    ]);

    const changeType = (fileType: string) => {
        setFileType(fileType);
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
                {renderTypeContent(fileType, risFileErrors, sampleFileErrors)}
                <div className="bottom">
                    <Button
                        variant="contained"
                        color="primary"
                        endIcon={<ChevronRightIcon />}
                        onClick={() => changeStep(3)}
                        disableElevation
                        disabled={risFileErrors && risFileErrors.blockingErrors.length > 0 ? true : false}
                    >
                        {i18n.t("Continue")}
                    </Button>
                </div>
            </ContentWrapper>
        );
};

const renderTypeContent = (type: string, risfileErrors?: ImportSummary, samplefileErrors?: ImportSummary) => {
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
                    {risfileErrors && risfileErrors.blockingErrors && (
                        <BlockingErrors rows={risfileErrors.blockingErrors} />
                    )}
                    {risfileErrors && risfileErrors.nonBlockingErrors && (
                        <NonBlockingWarnings rows={risfileErrors.nonBlockingErrors} />
                    )}
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
