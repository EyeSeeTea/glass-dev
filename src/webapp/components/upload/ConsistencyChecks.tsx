import React, { useCallback, useState } from "react";
import { Backdrop, Button, CircularProgress, Typography } from "@material-ui/core";
import { BlockingErrors } from "./BlockingErrors";
import styled from "styled-components";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { NonBlockingWarnings } from "./NonBlockingWarnings";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import CloudDownload from "@material-ui/icons/CloudDownload";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { useAppContext } from "../../contexts/app-context";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { Future } from "../../../domain/entities/Future";
import { ImportSummary } from "../../../domain/entities/data-entry/ImportSummary";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { SupportButtons } from "./SupportButtons";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { useSnackbar } from "@eyeseetea/d2-ui-components";

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
    const { compositionRoot, allCountries } = useAppContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const [fileType, setFileType] = useState<string>("primary");
    const [importLoading, setImportLoading] = useState<boolean>(false);
    const { currentPeriod } = useCurrentPeriodContext();
    const snackbar = useSnackbar();

    const changeType = (fileType: string) => {
        setFileType(fileType);
    };

    const downloadErrorsClick = useCallback(() => {
        const csvContent = [
            Object.keys(primaryFileImportSummary?.blockingErrors[0] ?? {}).join(","),
            ...(primaryFileImportSummary?.blockingErrors.map(
                ({ error, count, lines }) => `"${error}",${count},"${lines?.join(";")}"`
            ) ?? []),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8," });
        const downloadSimulateAnchor = document.createElement("a");
        downloadSimulateAnchor.href = URL.createObjectURL(blob);
        downloadSimulateAnchor.download = `${currentModuleAccess.moduleName}-${currentOrgUnitAccess.orgUnitCode}-${currentPeriod}-ERRORS.csv`;
        // simulate link click
        document.body.appendChild(downloadSimulateAnchor);
        downloadSimulateAnchor.click();
    }, [
        currentModuleAccess.moduleName,
        currentOrgUnitAccess.orgUnitCode,
        currentPeriod,
        primaryFileImportSummary?.blockingErrors,
    ]);

    const setUploadStatus = (
        primaryUploadId: string,
        secondaryUploadId: string | null,
        status: "VALIDATED" | "IMPORTED"
    ) => {
        compositionRoot.glassUploads
            .setStatus({
                id: primaryUploadId,
                status: status,
            })
            .run(
                () => {
                    if (secondaryUploadId)
                        compositionRoot.glassUploads
                            .setStatus({
                                id: secondaryUploadId,
                                status: status,
                            })
                            .run(
                                () => {
                                    changeStep(3);
                                    setImportLoading(false);
                                },
                                () => {
                                    snackbar.error(i18n.t("Failed to set upload status"));
                                    setImportLoading(false);
                                }
                            );
                    else {
                        changeStep(3);
                        setImportLoading(false);
                    }
                },
                () => {
                    snackbar.error(i18n.t("Failed to set upload status"));
                    setImportLoading(false);
                }
            );
    };

    const setUploadStatusAndSaveErrors = (
        primaryUploadId: string,
        secondaryUploadId: string | null,
        status: "VALIDATED" | "IMPORTED",
        importPrimaryFileSummary: ImportSummary | undefined,
        importSecondaryFileSummary: ImportSummary | undefined
    ) => {
        const params = secondaryUploadId
            ? {
                  primaryUploadId,
                  primaryImportSummaryErrors: {
                      nonBlockingErrors: importPrimaryFileSummary?.nonBlockingErrors || [],
                      blockingErrors: importPrimaryFileSummary?.blockingErrors || [],
                  },
                  secondaryUploadId,
                  secondaryImportSummaryErrors: {
                      nonBlockingErrors: importSecondaryFileSummary?.nonBlockingErrors || [],
                      blockingErrors: importSecondaryFileSummary?.blockingErrors || [],
                  },
              }
            : {
                  primaryUploadId,
                  primaryImportSummaryErrors: {
                      nonBlockingErrors: importPrimaryFileSummary?.nonBlockingErrors || [],
                      blockingErrors: importPrimaryFileSummary?.blockingErrors || [],
                  },
              };

        compositionRoot.glassUploads.saveImportSummaryErrorsOfFiles(params).run(
            () => {
                setUploadStatus(primaryUploadId, secondaryUploadId, status);
            },
            () => {
                setUploadStatus(primaryUploadId, secondaryUploadId, status);
            }
        );
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
                    currentOrgUnitAccess.orgUnitName,
                    currentOrgUnitAccess.orgUnitCode,
                    false,
                    "",
                    allCountries
                ),
                importSecondaryFileSummary: secondaryFile
                    ? compositionRoot.fileSubmission.secondaryFile(
                          secondaryFile,
                          batchId,
                          currentModuleAccess.moduleName,
                          currentPeriod,
                          "CREATE_AND_UPDATE",
                          currentOrgUnitAccess.orgUnitId,
                          currentOrgUnitAccess.orgUnitName,
                          currentOrgUnitAccess.orgUnitCode,
                          false,
                          ""
                      )
                    : Future.success(undefined),
            }).run(
                ({ importPrimaryFileSummary, importSecondaryFileSummary }) => {
                    /* eslint-disable no-console */
                    console.log({ importPrimaryFileSummary });
                    console.log({ importSecondaryFileSummary });

                    const primaryUploadId = localStorage.getItem("primaryUploadId");

                    setPrimaryFileImportSummary(importPrimaryFileSummary);

                    if (importSecondaryFileSummary) {
                        setSecondaryFileImportSummary(importSecondaryFileSummary);
                    }
                    const secondaryUploadId = localStorage.getItem("secondaryUploadId");
                    if (primaryUploadId) {
                        if (importPrimaryFileSummary.blockingErrors.length === 0) {
                            setUploadStatusAndSaveErrors(
                                primaryUploadId,
                                secondaryUploadId,
                                "VALIDATED",
                                importPrimaryFileSummary,
                                importSecondaryFileSummary
                            );
                        } else {
                            setUploadStatusAndSaveErrors(
                                primaryUploadId,
                                secondaryUploadId,
                                "IMPORTED",
                                importPrimaryFileSummary,
                                importSecondaryFileSummary
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
        } else if (secondaryFile && moduleProperties.get(currentModuleAccess.moduleName)?.isExternalSecondaryFile) {
            setImportLoading(true);

            compositionRoot.fileSubmission
                .secondaryFile(
                    secondaryFile,
                    batchId,
                    currentModuleAccess.moduleName,
                    currentPeriod,
                    "CREATE_AND_UPDATE",
                    currentOrgUnitAccess.orgUnitId,
                    currentOrgUnitAccess.orgUnitName,
                    currentOrgUnitAccess.orgUnitCode,
                    false,
                    ""
                )
                .run(
                    importSecondaryFileSummary => {
                        if (importSecondaryFileSummary) {
                            setSecondaryFileImportSummary(importSecondaryFileSummary);

                            const secondaryUploadId = localStorage.getItem("secondaryUploadId");
                            const params = {
                                primaryUploadId: "",
                                primaryImportSummaryErrors: {
                                    nonBlockingErrors: [],
                                    blockingErrors: [],
                                },
                                secondaryUploadId: secondaryUploadId || "",
                                secondaryImportSummaryErrors: {
                                    nonBlockingErrors: importSecondaryFileSummary?.nonBlockingErrors || [],
                                    blockingErrors: importSecondaryFileSummary?.blockingErrors || [],
                                },
                            };

                            compositionRoot.glassUploads.saveImportSummaryErrorsOfFiles(params).run(
                                () => {},
                                () => {}
                            );

                            if (importSecondaryFileSummary.blockingErrors.length === 0 && secondaryUploadId) {
                                compositionRoot.glassUploads
                                    .setStatus({ id: secondaryUploadId, status: "VALIDATED" })
                                    .run(
                                        () => {
                                            changeStep(3);
                                            setImportLoading(false);
                                        },
                                        () => {
                                            setImportLoading(false);
                                        }
                                    );
                            } else {
                                if (secondaryUploadId) {
                                    compositionRoot.glassUploads
                                        .setStatus({ id: secondaryUploadId, status: "IMPORTED" })
                                        .run(
                                            () => {
                                                setImportLoading(false);
                                            },
                                            () => {
                                                setImportLoading(false);
                                            }
                                        );
                                }
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
            if (
                moduleProperties.get(currentModuleAccess.moduleName)?.isCalculationRequired &&
                (primaryFile || secondaryFile)
            ) {
                const primaryUploadId = localStorage.getItem("primaryUploadId");
                if (primaryFile && primaryUploadId) {
                    compositionRoot.calculations
                        .consumptionDataProductLevel(
                            currentPeriod,
                            currentOrgUnitAccess.orgUnitId,
                            primaryFile,
                            currentModuleAccess.moduleName,
                            primaryUploadId
                        )
                        .run(
                            importSummary => {
                                console.debug(importSummary);
                                setImportLoading(false);
                                changeStep(3);
                            },
                            error => {
                                snackbar.error(error);
                                setImportLoading(false);
                                console.error(error);
                                changeStep(3);
                            }
                        );
                }
                const secondaryUploadId = localStorage.getItem("secondaryUploadId");
                if (secondaryUploadId) {
                    compositionRoot.calculations
                        .consumptionDataSubstanceLevel(
                            secondaryUploadId,
                            currentPeriod,
                            currentOrgUnitAccess.orgUnitId,
                            currentModuleAccess.moduleName
                        )
                        .run(
                            importSummary => {
                                console.debug(importSummary);
                                setImportLoading(false);
                                changeStep(3);
                            },
                            error => {
                                snackbar.error(error);
                                setImportLoading(false);
                                console.error(error);
                                changeStep(3);
                            }
                        );
                }
            } else {
                changeStep(3);
            }
            changeStep(3);
        }
    };

    const onCancelUpload = useCallback(
        (_event: React.MouseEvent<HTMLButtonElement>) => {
            // primaryFile && removePrimaryFile(event);
            // secondaryFile && removeSecondaryFile(event);
            changeStep(1);
        },
        [changeStep]
    );

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
            {moduleProperties.get(currentModuleAccess.moduleName)?.isSecondaryFileApplicable &&
                !moduleProperties.get(currentModuleAccess.moduleName)?.isSingleFileTypePerSubmission && (
                    <div className="toggles">
                        <Button
                            onClick={() => changeType("primary")}
                            className={fileType === "primary" ? "current" : ""}
                        >
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
                <SupportButtons
                    primaryFileImportSummary={primaryFileImportSummary}
                    secondaryFileImportSummary={secondaryFileImportSummary}
                    onCancelUpload={onCancelUpload}
                />
                <div className="right">
                    {primaryFileImportSummary && primaryFileImportSummary.blockingErrors.length > 0 && (
                        <Button
                            variant="contained"
                            color="primary"
                            endIcon={<CloudDownload />}
                            onClick={downloadErrorsClick}
                        >
                            {i18n.t("Download Errors as CSV")}
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        color="primary"
                        endIcon={<ChevronRightIcon />}
                        onClick={continueClick}
                        disableElevation
                        disabled={
                            (primaryFileImportSummary && primaryFileImportSummary.blockingErrors.length > 0) ||
                            (secondaryFileImportSummary && secondaryFileImportSummary.blockingErrors.length > 0)
                                ? true
                                : false
                        }
                    >
                        {i18n.t("Continue")}
                    </Button>
                </div>
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
            border: 2px solid ${glassColors.greyLight};
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
    .right {
        display: flex;
        align-items: flex-end;
        gap: 20px;
    }
`;

export const StyledLoaderContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
`;
