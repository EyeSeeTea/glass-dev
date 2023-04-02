import React, { useCallback, useState, useEffect } from "react";
import { Backdrop, Button, CircularProgress, Typography } from "@material-ui/core";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { ImportSummary } from "../../../domain/entities/data-entry/ImportSummary";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { useCallbackEffect } from "../../hooks/use-callback-effect";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { Future } from "../../../domain/entities/Future";
import { useLocation } from "react-router-dom";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { StyledLoaderContainer } from "./ConsistencyChecks";

interface ReviewDataSummaryProps {
    changeStep: (step: number) => void;
    risFile: File | null;
    sampleFile?: File | null;
    batchId: string;
}

const COMPLETED_STATUS = "COMPLETED";

export const ReviewDataSummary: React.FC<ReviewDataSummaryProps> = ({ changeStep, risFile, sampleFile, batchId }) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const [fileType, setFileType] = useState<string>("ris");
    const [risFileImportSummary, setRisFileImportSummary] = useState<ImportSummary>();
    const [sampleFileImportSummary, setSampleFileImportSummary] = useState<ImportSummary>();

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDataSetUploading, setIsDataSetUploading] = useState<boolean>(false);
    const location = useLocation();
    const queryParameters = new URLSearchParams(location.search);
    const periodFromUrl = parseInt(queryParameters.get("period") || "");
    const year = periodFromUrl || new Date().getFullYear() - 1;

    useEffect(() => {
        function uploadDatasets() {
            if (risFile && currentModuleAccess.moduleName === "AMR") {
                setIsDataSetUploading(true);

                Future.joinObj({
                    importRISFileSummary: compositionRoot.dataSubmision.RISFile(
                        risFile,
                        batchId,
                        year,
                        "CREATE_AND_UPDATE",
                        currentOrgUnitAccess.orgUnitId,
                        currentOrgUnitAccess.orgUnitCode,
                        false
                    ),
                    importSampleFileSummary: sampleFile
                        ? compositionRoot.dataSubmision.sampleFile(
                              sampleFile,
                              batchId,
                              year,
                              "CREATE_AND_UPDATE",
                              currentOrgUnitAccess.orgUnitId,
                              currentOrgUnitAccess.orgUnitCode,
                              false
                          )
                        : Future.success(undefined),
                }).run(
                    ({ importRISFileSummary, importSampleFileSummary }) => {
                        setRisFileImportSummary(importRISFileSummary);
                        if (importSampleFileSummary) {
                            setSampleFileImportSummary(importSampleFileSummary);
                        }
                        setIsDataSetUploading(false);
                    },
                    error => {
                        setRisFileImportSummary({
                            status: "ERROR",
                            importCount: {
                                imported: 0,
                                updated: 0,
                                ignored: 0,
                                deleted: 0,
                            },
                            nonBlockingErrors: [error],
                            blockingErrors: [],
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
        setRisFileImportSummary,
        setSampleFileImportSummary,
        batchId,
        year,
        currentOrgUnitAccess.orgUnitCode,
        currentOrgUnitAccess.orgUnitId,
    ]);

    const changeType = (fileType: string) => {
        setFileType(fileType);
    };

    const goToFinalStep = useCallback(() => {
        const risUploadId = localStorage.getItem("risUploadId");
        const sampleUploadId = localStorage.getItem("sampleUploadId");
        setIsLoading(true);
        if (risUploadId) {
            return compositionRoot.glassUploads.setStatus({ id: risUploadId, status: COMPLETED_STATUS }).run(
                () => {
                    if (!sampleUploadId) {
                        changeStep(4);
                        setIsLoading(false);
                    } else {
                        return compositionRoot.glassUploads
                            .setStatus({ id: sampleUploadId, status: COMPLETED_STATUS })
                            .run(
                                () => {
                                    changeStep(4);
                                    setIsLoading(false);
                                },
                                errorMessage => {
                                    snackbar.error(i18n.t(errorMessage));
                                    setIsLoading(false);
                                }
                            );
                    }
                },
                errorMessage => {
                    snackbar.error(i18n.t(errorMessage));
                    setIsLoading(false);
                }
            );
        }
    }, [changeStep, compositionRoot.glassUploads, snackbar]);

    const goToFinalStepEffect = useCallbackEffect(goToFinalStep);

    return (
        <ContentWrapper>
            <Backdrop open={isDataSetUploading} style={{ color: "#fff", zIndex: 1 }}>
                <StyledLoaderContainer>
                    <CircularProgress color="inherit" size={50} />
                    <Typography variant="h6">{i18n.t("Importing data")}</Typography>
                    <Typography variant="h5">
                        {i18n.t("This might take several minutes, do not refresh the page or press back.")}
                    </Typography>
                </StyledLoaderContainer>
            </Backdrop>
            <div className="toggles">
                <Button onClick={() => changeType("ris")} className={fileType === "ris" ? "current" : ""}>
                    {i18n.t("RIS File")}
                </Button>
                <Button onClick={() => changeType("sample")} className={fileType === "sample" ? "current" : ""}>
                    {i18n.t("Sample File")}
                </Button>
            </div>
            <Section className="summary">
                <h3>{i18n.t("Summary")}</h3>
                <SectionCard className="wrong">
                    <ul>
                        <li>
                            <b>{i18n.t("imported: ")}</b>{" "}
                            {fileType === "ris"
                                ? risFileImportSummary?.importCount.imported
                                : sampleFileImportSummary?.importCount.imported}
                        </li>
                        <li>
                            <b>{i18n.t("updated: ")}</b>{" "}
                            {fileType === "ris"
                                ? risFileImportSummary?.importCount.updated
                                : sampleFileImportSummary?.importCount.updated}
                        </li>
                        <li>
                            <b>{i18n.t("deleted: ")}</b>{" "}
                            {fileType === "ris"
                                ? risFileImportSummary?.importCount.deleted
                                : sampleFileImportSummary?.importCount.deleted}
                            {}
                        </li>
                        <li>
                            <b>{i18n.t("ignored: ")}</b>{" "}
                            {fileType === "ris"
                                ? risFileImportSummary?.importCount.ignored
                                : sampleFileImportSummary?.importCount.ignored}
                        </li>
                    </ul>
                </SectionCard>
            </Section>
            <div className="bottom">
                {isLoading ? (
                    <CircularProgress size={25} />
                ) : (
                    <Button
                        variant="contained"
                        color={"primary"}
                        endIcon={<ChevronRightIcon />}
                        onClick={goToFinalStepEffect}
                        disableElevation
                    >
                        {i18n.t("Continue")}
                    </Button>
                )}
            </div>
        </ContentWrapper>
    );
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
    .bottom {
        display: flex;
        align-items: baseline;
        justify-content: center;
        margin: 0 auto 30px auto;
        align-items: flex-end;
        width: 100%;
    }
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    h3 {
        margin: 0;
        font-size: 21px;
        font-weight: 500;
    }
    &.charts {
        img {
            display: block;
            width: 100%;
        }
    }
`;
const SectionCard = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
    padding: 20px;
    box-shadow: rgb(0 0 0 / 12%) 0px 1px 6px, rgb(0 0 0 / 12%) 0px 1px 4px;
    ul {
        margin: 0;
        padding: 0;
        display: flex;
        gap: 20px;
        list-style-type: none;
        li {
            display: inline-block;
        }
    }
`;
