import React, { useEffect, useState } from "react";
import { Backdrop, Button, CircularProgress, Typography } from "@material-ui/core";
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
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";

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
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const [fileType, setFileType] = useState<string>("ris");
    const [dryRunImportLoading, setDryRunImportLoading] = useState<boolean>(false);
    const [risFileErrors, setRISErrors] = useState<ImportSummary | undefined>(undefined);
    const [sampleFileErrors, setSampleErrors] = useState<ImportSummary | undefined>(undefined);
    const { currentPeriod } = useCurrentPeriodContext();

    useEffect(() => {
        function uploadDatasetsAsDryRun() {
            if (risFile && currentModuleAccess.moduleName === "AMR") {
                setDryRunImportLoading(true);

                Future.joinObj({
                    importRISFileSummary: compositionRoot.dataSubmision.RISFile(
                        risFile,
                        batchId,
                        currentPeriod,
                        "CREATE_AND_UPDATE",
                        currentOrgUnitAccess.orgUnitId,
                        currentOrgUnitAccess.orgUnitCode,
                        true
                    ),
                    importSampleFileSummary: sampleFile
                        ? compositionRoot.dataSubmision.sampleFile(
                              sampleFile,
                              batchId,
                              currentPeriod,
                              "CREATE_AND_UPDATE",
                              currentOrgUnitAccess.orgUnitId,
                              currentOrgUnitAccess.orgUnitCode,
                              true
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

                        setDryRunImportLoading(false);
                    },
                    error => {
                        setRISErrors({
                            status: "ERROR",
                            importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
                            nonBlockingErrors: [],
                            blockingErrors: [{ error: error, count: 1 }],
                        });

                        setDryRunImportLoading(false);
                    }
                );
            }
        }

        uploadDatasetsAsDryRun();
    }, [
        compositionRoot.dataSubmision,
        currentModuleAccess.moduleName,
        risFile,
        sampleFile,
        setRISFileImportSummary,
        setSampleFileImportSummary,
        batchId,
        currentPeriod,
        currentOrgUnitAccess.orgUnitId,
        currentOrgUnitAccess.orgUnitCode,
    ]);

    const changeType = (fileType: string) => {
        setFileType(fileType);
    };

    return (
        <ContentWrapper>
            <Backdrop open={dryRunImportLoading} style={{ color: "#fff", zIndex: 1 }}>
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
            <div>
                <Typography variant="h6">
                    {i18n.t("These Consistency Checks ensure that incorrect data is not imported.")}
                </Typography>
                <Typography>
                    {i18n.t("Both Validations specified by validation rules and custom validations are complete. ")}
                </Typography>
                <Typography>
                    {i18n.t(
                        "All Blocking errors need to be addressed. Please reupload correct data to complete the data submission"
                    )}
                </Typography>
                <Typography>
                    {i18n.t(
                        "Non-Blocking errors are warnings, it is good to address them. However, you can still proceed with the submission."
                    )}
                </Typography>
            </div>
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

export const StyledLoaderContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;
