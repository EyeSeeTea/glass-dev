import React, { useState } from "react";
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
import { SupportButtons } from "./SupportButtons";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";

interface ConsistencyChecksProps {
    changeStep: (step: number) => void;
    batchId: string;
    primaryFile: File | null;
    secondaryFile?: File | null;
    primaryFileImportSummary: ImportSummary | undefined;
    secondaryFileImportSummary: ImportSummary | undefined;
    setPrimaryFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>;
    setSecondaryFileImportSummary: React.Dispatch<React.SetStateAction<ImportSummary | undefined>>;
}

export const ConsistencyChecks: React.FC<ConsistencyChecksProps> = ({
    changeStep,
    batchId,
    primaryFile,
    secondaryFile,
    primaryFileImportSummary,
    secondaryFileImportSummary,
    setPrimaryFileImportSummary,
    setSecondaryFileImportSummary,
}) => {
    const { compositionRoot } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const [fileType, setFileType] = useState<string>("primary");
    const [importLoading, setImportLoading] = useState<boolean>(false);
    const { currentPeriod } = useCurrentPeriodContext();

    const changeType = (fileType: string) => {
        setFileType(fileType);
    };

    const continueClick = () => {
        if (primaryFile && moduleProperties.get(currentModuleAccess.moduleName)?.isDryRunReq) {
            setImportLoading(true);

            Future.joinObj({
                importPrimaryFileSummary: compositionRoot.fileSubmission.primaryFile(
                    currentModuleAccess.moduleName,
                    primaryFile,
                    batchId,
                    currentPeriod,
                    "CREATE_AND_UPDATE",
                    currentOrgUnitAccess.orgUnitId,
                    currentOrgUnitAccess.orgUnitCode,
                    false,
                    ""
                ),
                importSecondaryFileSummary: secondaryFile
                    ? compositionRoot.fileSubmission.secondaryFile(
                          secondaryFile,
                          batchId,
                          currentPeriod,
                          "CREATE_AND_UPDATE",
                          currentOrgUnitAccess.orgUnitId,
                          currentOrgUnitAccess.orgUnitCode,
                          false
                      )
                    : Future.success(undefined),
            }).run(
                ({ importPrimaryFileSummary, importSecondaryFileSummary }) => {
                    /* eslint-disable no-console */
                    console.log({ importPrimaryFileSummary });
                    console.log({ importSecondaryFileSummary });

                    setPrimaryFileImportSummary(importPrimaryFileSummary);

                    if (importSecondaryFileSummary) {
                        setSecondaryFileImportSummary(importSecondaryFileSummary);
                    }

                    if (importPrimaryFileSummary.blockingErrors.length === 0) {
                        const primaryUploadId = localStorage.getItem("primaryUploadId");
                        if (primaryUploadId) {
                            compositionRoot.glassUploads.setStatus({ id: primaryUploadId, status: "VALIDATED" }).run(
                                () => {
                                    changeStep(3);
                                    setImportLoading(false);
                                },
                                () => {
                                    setImportLoading(false);
                                }
                            );
                        }
                    } else {
                        const primaryUploadId = localStorage.getItem("primaryUploadId");
                        if (primaryUploadId) {
                            compositionRoot.glassUploads.setStatus({ id: primaryUploadId, status: "IMPORTED" }).run(
                                () => {
                                    setImportLoading(false);
                                },
                                () => {
                                    setImportLoading(false);
                                }
                            );
                        }
                    }
                },
                error => {
                    setPrimaryFileImportSummary({
                        status: "ERROR",
                        importCount: { ignored: 0, imported: 0, deleted: 0, updated: 0 },
                        nonBlockingErrors: [],
                        blockingErrors: [{ error: error, count: 1 }],
                    });

                    setImportLoading(false);
                }
            );
        } else {
            changeStep(3);
        }
    };

    return (
        <ContentWrapper>
            <Backdrop open={importLoading} style={{ color: "#fff", zIndex: 1 }}>
                <StyledLoaderContainer>
                    <CircularProgress color="inherit" size={50} />
                    <Typography variant="h6">{i18n.t("Importing data and applying validation rules")}</Typography>
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
                    {i18n.t(
                        "Custom validations are complete, validation rules will be run after the actual import is completed. "
                    )}
                </Typography>
                <Typography>
                    {i18n.t(
                        "All blocking errors need to be addressed. If found, please re-upload correct data to complete the data submission"
                    )}
                </Typography>
                <Typography>
                    {i18n.t(
                        "Non-Blocking errors are warnings, it is good to address them. However, you can still proceed with the submission."
                    )}
                </Typography>
            </div>
            {moduleProperties.get(currentModuleAccess.moduleName)?.isSecondaryFileApplicable && (
                <div className="toggles">
                    <Button onClick={() => changeType("primary")} className={fileType === "primary" ? "current" : ""}>
                        {i18n.t(`${moduleProperties.get(currentModuleAccess.moduleName)?.primaryFileType} File`)}
                    </Button>
                    <Button
                        onClick={() => changeType("secondary")}
                        className={fileType === "secondary" ? "current" : ""}
                    >
                        {i18n.t(`${moduleProperties.get(currentModuleAccess.moduleName)?.secondaryFileType} File`)}
                    </Button>
                </div>
            )}
            {renderTypeContent(
                fileType,
                currentModuleAccess.moduleName,
                primaryFileImportSummary,
                secondaryFileImportSummary
            )}
            <div className="bottom">
                <SupportButtons changeStep={changeStep} primaryFileImportSummary={primaryFileImportSummary} />
                <Button
                    variant="contained"
                    color="primary"
                    endIcon={<ChevronRightIcon />}
                    onClick={continueClick}
                    disableElevation
                    disabled={
                        primaryFileImportSummary && primaryFileImportSummary.blockingErrors.length > 0 ? true : false
                    }
                >
                    {i18n.t("Continue")}
                </Button>
            </div>
        </ContentWrapper>
    );
};

const renderTypeContent = (
    type: string,
    moduleName: string,
    primaryFileImportSummary?: ImportSummary,
    secondaryFileImportSummary?: ImportSummary
) => {
    switch (type) {
        case "secondary":
            return secondaryFileImportSummary ? (
                <>
                    {secondaryFileImportSummary.blockingErrors && (
                        <BlockingErrors rows={secondaryFileImportSummary.blockingErrors} />
                    )}
                    {secondaryFileImportSummary.nonBlockingErrors && (
                        <NonBlockingWarnings rows={secondaryFileImportSummary.nonBlockingErrors} />
                    )}
                </>
            ) : (
                <p>{i18n.t(`No ${moduleProperties.get(moduleName)?.secondaryFileType} file uploaded`)}</p>
            );
        default:
            return (
                <>
                    {primaryFileImportSummary && primaryFileImportSummary.blockingErrors && (
                        <BlockingErrors rows={primaryFileImportSummary.blockingErrors} />
                    )}
                    {primaryFileImportSummary && primaryFileImportSummary.nonBlockingErrors && (
                        <NonBlockingWarnings rows={primaryFileImportSummary.nonBlockingErrors} />
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
            border-: 2px solid ${glassColors.greyLight};
            &.current {
                color: ${glassColors.mainPrimary};
                border-bottom: 4px solid ${glassColors.mainPrimary};
            }
        }
    }
    .bottom {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
    }
`;

export const StyledLoaderContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;
