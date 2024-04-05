import React, { useCallback, useState } from "react";
import { Backdrop, TableBody, TableCell, TableRow, Button, DialogContent, Typography } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import dayjs from "dayjs";
import { UploadsDataItem } from "../../entities/uploads";
import { DeleteOutline } from "@material-ui/icons";
import { useAppContext } from "../../contexts/app-context";
import { ConfirmationDialog, useSnackbar } from "@eyeseetea/d2-ui-components";
import { CircularProgress } from "material-ui";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { Future } from "../../../domain/entities/Future";
import { isEditModeStatus } from "../../../utils/editModeStatus";
import { useStatusDataSubmission } from "../../hooks/useStatusDataSubmission";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useGlassCaptureAccess } from "../../hooks/useGlassCaptureAccess";
import { StyledLoaderContainer } from "../upload/ConsistencyChecks";
import { useCurrentPeriodContext } from "../../contexts/current-period-context";
import { moduleProperties } from "../../../domain/utils/ModuleProperties";
import { ImportOptions, ImportSummaryErrors } from "../../../domain/entities/data-entry/ImportSummary";
import { ImportSummaryErrorsDialog } from "../import-summary-errors-dialog/ImportSummaryErrorsDialog";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { ImportStrategy } from "../../../domain/entities/data-entry/DataValuesSaveSummary";

export interface UploadsTableBodyProps {
    rows?: UploadsDataItem[];
    refreshUploads: React.Dispatch<React.SetStateAction<{}>>;
}

export const UploadsTableBody: React.FC<UploadsTableBodyProps> = ({ rows, refreshUploads }) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();

    const [loading, setLoading] = useState<boolean>(false);
    const {
        currentOrgUnitAccess: { orgUnitId, orgUnitName },
    } = useCurrentOrgUnitContext();
    const [open, setOpen] = React.useState(false);
    const [importSummaryErrorsToShow, setImportSummaryErrorsToShow] = React.useState<ImportSummaryErrors | null>(null);
    const [rowToDelete, setRowToDelete] = useState<UploadsDataItem>();

    const { currentPeriod } = useCurrentPeriodContext();

    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const currentDataSubmissionStatus = useStatusDataSubmission(
        { id: currentModuleAccess.moduleId, name: currentModuleAccess.moduleName },
        currentOrgUnitAccess.orgUnitId,
        currentPeriod
    );
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess();

    const showConfirmationDialog = (rowToDelete: UploadsDataItem) => {
        setRowToDelete(rowToDelete);
        setOpen(true);
    };
    const hideConfirmationDialog = () => {
        setOpen(false);
    };

    const downloadFile = (fileId: string, fileName: string) => {
        compositionRoot.glassDocuments.download(fileId).run(
            file => {
                //download file automatically
                const downloadSimulateAnchor = document.createElement("a");
                downloadSimulateAnchor.href = URL.createObjectURL(file);
                downloadSimulateAnchor.download = fileName;
                // simulate link click
                document.body.appendChild(downloadSimulateAnchor);
                downloadSimulateAnchor.click();
            },
            () => {}
        );
    };

    //Deleting a dataset completely has the following steps:
    //1. Delete corresponsding datasetValue/event for each row in the file.
    //2. Delete corresponding document from DHIS
    //3. Delete corresponding 'upload' and 'document' from Datastore
    const deleteDataset = () => {
        hideConfirmationDialog();
        if (rowToDelete) {
            let primaryFileToDelete: UploadsDataItem | undefined, secondaryFileToDelete: UploadsDataItem | undefined;
            //For AMR, Ris file is mandatory, so there will be a ris file with given batch id.
            //Sample file is optional and could be absent
            if (
                moduleProperties.get(currentModuleAccess.moduleName)?.isSecondaryFileApplicable &&
                moduleProperties.get(currentModuleAccess.moduleName)?.isSecondaryRelated
            ) {
                if (
                    rowToDelete.fileType.toLowerCase() ===
                    moduleProperties.get(currentModuleAccess.moduleName)?.primaryFileType.toLowerCase()
                ) {
                    primaryFileToDelete = rowToDelete;
                    secondaryFileToDelete = rows
                        ?.filter(sample => sample.correspondingRisUploadId === rowToDelete.id)
                        ?.at(0);
                } else {
                    secondaryFileToDelete = rowToDelete;
                    primaryFileToDelete = rows?.filter(ris => ris.id === rowToDelete.correspondingRisUploadId)?.at(0);
                }
            } else if (!moduleProperties.get(currentModuleAccess.moduleName)?.isSecondaryRelated) {
                if (rowToDelete.fileType === moduleProperties.get(currentModuleAccess.moduleName)?.primaryFileType) {
                    primaryFileToDelete = rowToDelete;
                } else {
                    secondaryFileToDelete = rowToDelete;
                }
            } else {
                primaryFileToDelete = rowToDelete;
                secondaryFileToDelete = undefined;
            }

            if (primaryFileToDelete) {
                setLoading(true);
                Future.joinObj({
                    primaryFileDownload: compositionRoot.glassDocuments.download(primaryFileToDelete.fileId),
                    secondaryFileDownload: secondaryFileToDelete
                        ? compositionRoot.glassDocuments.download(secondaryFileToDelete.fileId)
                        : Future.success(undefined),
                }).run(
                    ({ primaryFileDownload, secondaryFileDownload }) => {
                        if (primaryFileToDelete) {
                            const primaryFile = new File([primaryFileDownload], primaryFileToDelete.fileName);
                            //If the file is in uploaded status then, data vales have not been imported.
                            //No need for deletion

                            const baseOptions = {
                                moduleName: currentModuleAccess.moduleName,
                                action: "DELETE" as ImportStrategy,
                                orgUnitId: orgUnitId,
                                orgUnitName: orgUnitName,
                                dryRun: false,
                            };

                            const primaryOptions: ImportOptions = {
                                ...baseOptions,
                                batchId: primaryFileToDelete.batchId,
                                period: primaryFileToDelete.period,
                                countryCode: primaryFileToDelete.countryCode,
                                eventListId: primaryFileToDelete.eventListFileId,
                            };

                            const secondaryOptions: ImportOptions = {
                                ...baseOptions,
                                batchId: secondaryFileToDelete?.batchId || "",
                                period: secondaryFileToDelete?.period || "",
                                countryCode: secondaryFileToDelete?.countryCode || "",
                                eventListId: secondaryFileToDelete?.eventListFileId,
                            };

                            Future.joinObj({
                                deletePrimaryFileSummary:
                                    primaryFileToDelete.status.toLowerCase() !== "uploaded" ||
                                    !moduleProperties.get(currentModuleAccess.moduleName)?.isDryRunReq
                                        ? compositionRoot.fileSubmission.primaryFile(primaryFile, primaryOptions)
                                        : Future.success(undefined),
                                deleteSecondaryFileSummary:
                                    secondaryFileToDelete &&
                                    secondaryFileToDelete.status.toLowerCase() !== "uploaded" &&
                                    secondaryFileDownload
                                        ? compositionRoot.fileSubmission.secondaryFile(
                                              new File([secondaryFileDownload], secondaryFileToDelete.fileName),
                                              secondaryOptions
                                          )
                                        : Future.success(undefined),
                            }).run(
                                ({ deletePrimaryFileSummary, deleteSecondaryFileSummary }) => {
                                    if (deletePrimaryFileSummary) {
                                        const itemsDeleted =
                                            currentModuleAccess.moduleName === "AMC" ? "products" : "rows";

                                        let message = `${
                                            primaryFileToDelete?.rows || primaryFileToDelete?.records
                                        } ${itemsDeleted} deleted for ${
                                            moduleProperties.get(currentModuleAccess.moduleName)?.primaryFileType
                                        } file`;

                                        if (secondaryFileToDelete && deleteSecondaryFileSummary) {
                                            message =
                                                message +
                                                ` and ${
                                                    secondaryFileToDelete.rows || secondaryFileToDelete.records
                                                } rows deleted for ${
                                                    moduleProperties.get(currentModuleAccess.moduleName)
                                                        ?.secondaryFileType
                                                } file.`;
                                        }

                                        snackbar.info(message);
                                    }
                                    if (primaryFileToDelete) {
                                        compositionRoot.glassDocuments.deleteByUploadId(primaryFileToDelete.id).run(
                                            () => {
                                                if (secondaryFileToDelete) {
                                                    compositionRoot.glassDocuments
                                                        .deleteByUploadId(secondaryFileToDelete.id)
                                                        .run(
                                                            () => {
                                                                refreshUploads({}); //Trigger re-render of parent
                                                                setLoading(false);
                                                                hideConfirmationDialog();
                                                            },
                                                            error => {
                                                                snackbar.error("Error deleting file");
                                                                console.error(error);
                                                            }
                                                        );
                                                } else {
                                                    refreshUploads({}); //Trigger re-render of parent
                                                    setLoading(false);
                                                    hideConfirmationDialog();
                                                }
                                            },
                                            error => {
                                                snackbar.error("Error deleting file");
                                                console.error(error);
                                            }
                                        );
                                    }
                                },
                                error => {
                                    snackbar.error("Error deleting file");
                                    console.error(error);
                                    setLoading(false);
                                }
                            );
                        }
                    },
                    error => {
                        console.debug(
                            `Unable to download primary fileid : ${primaryFileToDelete?.fileId} OR secondary fileid : ${secondaryFileToDelete?.fileId}, error: ${error} `
                        );
                        setLoading(false);
                    }
                );
            } else if (secondaryFileToDelete) {
                setLoading(true);
                compositionRoot.glassDocuments.download(secondaryFileToDelete.fileId).run(
                    secondaryFileDownload => {
                        if (
                            secondaryFileToDelete &&
                            secondaryFileToDelete.status.toLowerCase() !== "uploaded" &&
                            secondaryFileDownload
                        ) {
                            const secondaryOptions: ImportOptions = {
                                moduleName: currentModuleAccess.moduleName,
                                action: "DELETE" as ImportStrategy,
                                orgUnitId: orgUnitId,
                                orgUnitName: orgUnitName,
                                dryRun: false,
                                batchId: secondaryFileToDelete.batchId,
                                period: secondaryFileToDelete.period,
                                countryCode: secondaryFileToDelete.countryCode,
                                eventListId: secondaryFileToDelete.eventListFileId,
                            };

                            compositionRoot.fileSubmission
                                .secondaryFile(
                                    new File([secondaryFileDownload], secondaryFileToDelete.fileName),
                                    secondaryOptions,
                                    secondaryFileToDelete.calculatedEventListFileId
                                )
                                .run(
                                    deleteSecondaryFileSummary => {
                                        if (secondaryFileToDelete && deleteSecondaryFileSummary) {
                                            const itemsDeleted =
                                                currentModuleAccess.moduleName === "AMC" ? "substances" : "rows";

                                            const message = ` ${
                                                secondaryFileToDelete.rows || secondaryFileToDelete.records
                                            } ${itemsDeleted} deleted for ${
                                                moduleProperties.get(currentModuleAccess.moduleName)?.secondaryFileType
                                            } file.`;
                                            compositionRoot.glassDocuments
                                                .deleteByUploadId(secondaryFileToDelete.id)
                                                .run(
                                                    () => {
                                                        refreshUploads({}); //Trigger re-render of parent
                                                        setLoading(false);
                                                        hideConfirmationDialog();
                                                        snackbar.info(message);
                                                    },
                                                    error => {
                                                        snackbar.error("Error deleting file");
                                                        console.error(error);
                                                    }
                                                );
                                        }
                                    },
                                    error => {
                                        snackbar.error("Error deleting file");
                                        console.error(error);
                                        setLoading(false);
                                    }
                                );
                        }
                    },
                    error => {
                        console.debug(
                            `Unable to download secondary fileid : ${secondaryFileToDelete?.fileId}, error: ${error} `
                        );
                        setLoading(false);
                    }
                );
            } else {
                //Primary file doesnt exist, only secondary file exists. This should never happen as Primary file is mandatory.
                snackbar.error(
                    `Mandatory ${
                        moduleProperties.get(currentModuleAccess.moduleName)?.primaryFileType
                    } file does not exist.`
                );
            }
        }
    };

    const handleShowImportSummaryErrors = useCallback((row: UploadsDataItem) => {
        if (row.importSummary) {
            setImportSummaryErrorsToShow(row.importSummary);
        }
    }, []);

    return (
        <>
            {rows && (
                <StyledTableBody>
                    <TableRow>
                        <TableCell style={{ border: "none", padding: 0 }}>
                            <>
                                <Backdrop open={loading} style={{ color: "#fff", zIndex: 1 }}>
                                    <StyledLoaderContainer>
                                        <CircularProgress color="#fff" size={50} />
                                        <Typography variant="h6">{i18n.t("Deleting Files")}</Typography>
                                        <Typography variant="h5">
                                            {i18n.t(
                                                "This might take several minutes, do not refresh the page or press back."
                                            )}
                                        </Typography>
                                    </StyledLoaderContainer>
                                </Backdrop>
                                <ConfirmationDialog
                                    isOpen={open}
                                    title={
                                        moduleProperties.get(currentModuleAccess.moduleName)?.deleteConfirmation.title
                                    }
                                    onSave={deleteDataset}
                                    onCancel={hideConfirmationDialog}
                                    saveText={i18n.t("Ok")}
                                    cancelText={i18n.t("Cancel")}
                                    fullWidth={true}
                                    disableEnforceFocus
                                >
                                    <DialogContent>
                                        <Typography>
                                            {
                                                moduleProperties.get(currentModuleAccess.moduleName)?.deleteConfirmation
                                                    .description
                                            }
                                        </Typography>
                                    </DialogContent>
                                </ConfirmationDialog>
                                <ImportSummaryErrorsDialog
                                    importSummaryErrorsToShow={importSummaryErrorsToShow}
                                    onClose={() => setImportSummaryErrorsToShow(null)}
                                />
                            </>
                        </TableCell>
                    </TableRow>
                    {rows.map((row: UploadsDataItem) => (
                        <TableRow key={row.id} onClick={() => handleShowImportSummaryErrors(row)}>
                            <TableCell>{dayjs(row.uploadDate).format("DD-MM-YYYY")}</TableCell>
                            <TableCell>{row.period}</TableCell>
                            <TableCell>{row?.records || row?.rows}</TableCell>
                            <TableCell>{row.fileType}</TableCell>
                            {moduleProperties.get(currentModuleAccess.moduleName)?.isbatchReq && (
                                <TableCell style={{ opacity: 0.5 }}>{row.batchId}</TableCell>
                            )}
                            <TableCell>{i18n.t(row.status).toUpperCase()}</TableCell>
                            <TableCell style={{ opacity: 0.5 }}>
                                <Button
                                    onClick={event => {
                                        event.stopPropagation();
                                        downloadFile(row.fileId, row.fileName);
                                    }}
                                >
                                    <StyledUnderLineType title={row.fileName}>{row.fileName}</StyledUnderLineType>
                                </Button>
                            </TableCell>
                            <TableCell style={{ opacity: 0.5 }}>
                                {currentDataSubmissionStatus.kind === "loaded" ? (
                                    <Button
                                        onClick={e => {
                                            e.stopPropagation();
                                            showConfirmationDialog(row);
                                        }}
                                        disabled={
                                            !hasCurrentUserCaptureAccess ||
                                            !isEditModeStatus(currentDataSubmissionStatus.data.title)
                                        }
                                    >
                                        <DeleteOutline />
                                    </Button>
                                ) : (
                                    <CircularProgress size={20} />
                                )}
                            </TableCell>
                            <StyledCTACell className="cta">{row.importSummary && <ChevronRightIcon />}</StyledCTACell>
                        </TableRow>
                    ))}
                </StyledTableBody>
            )}
        </>
    );
};

const StyledTableBody = styled(TableBody)``;

const StyledCTACell = styled(TableCell)`
    text-align: center;
    svg {
        color: ${glassColors.grey};
    }
    &:hover {
        svg {
            color: ${glassColors.greyBlack};
        }
    }
`;

const StyledUnderLineType = styled(Typography)`
    max-width: 250px;
    text-overflow: ellipsis;
    overflow: hidden;
    &:hover {
        text-decoration: underline;
    }
`;
