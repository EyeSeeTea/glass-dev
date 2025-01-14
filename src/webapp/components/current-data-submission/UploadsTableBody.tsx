import React, { useCallback, useState } from "react";
import { Backdrop, TableBody, TableCell, TableRow, Button, DialogContent, Typography } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import dayjs from "dayjs";
import _ from "lodash";
import { UploadsDataItem } from "../../entities/uploads";
import { DeleteOutline } from "@material-ui/icons";
import { CheckCircleOutline } from "@material-ui/icons";
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
import { ImportSummaryErrors } from "../../../domain/entities/data-entry/ImportSummary";
import { ImportSummaryErrorsDialog } from "../import-summary-errors-dialog/ImportSummaryErrorsDialog";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { useGlassUploadsAsyncDeletions } from "../../hooks/useGlassUploadsAsyncDeletions";
import { getPrimaryAndSecondaryFilesToDelete } from "../../utils/getPrimaryAndSecondaryFilesToDelete";
import { useGlassModule } from "../../hooks/useGlassModule";
import { Id } from "../../../domain/entities/Ref";
import { useQuestionnaires } from "./Questionnaires";
import { DataSubmissionStatusTypes } from "../../../domain/entities/GlassDataSubmission";

export interface UploadsTableBodyProps {
    rows?: UploadsDataItem[];
    refreshUploads: React.Dispatch<React.SetStateAction<{}>>;
    showComplete?: boolean;
    setIsDatasetMarkAsCompleted?: React.Dispatch<React.SetStateAction<boolean>>;
    setRefetchStatus?: React.Dispatch<React.SetStateAction<DataSubmissionStatusTypes | undefined>>;
}

export const UploadsTableBody: React.FC<UploadsTableBodyProps> = ({
    rows,
    refreshUploads,
    showComplete,
    setIsDatasetMarkAsCompleted,
    setRefetchStatus,
}) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();

    const [loading, setLoading] = useState<boolean>(false);
    const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [completeOpen, setCompleteOpen] = React.useState(false);
    const [importSummaryErrorsToShow, setImportSummaryErrorsToShow] = React.useState<ImportSummaryErrors | null>(null);
    const [rowToDelete, setRowToDelete] = useState<UploadsDataItem>();
    const [rowToComplete, setRowToComplete] = useState<UploadsDataItem>();

    const { currentPeriod } = useCurrentPeriodContext();

    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const currentDataSubmissionStatus = useStatusDataSubmission(
        { id: currentModuleAccess.moduleId, name: currentModuleAccess.moduleName },
        currentOrgUnitAccess.orgUnitId,
        currentPeriod
    );
    const hasCurrentUserCaptureAccess = useGlassCaptureAccess();
    const { asyncDeletions: asyncDeletionsState, setToAsyncDeletions } = useGlassUploadsAsyncDeletions();
    const currentModule = useGlassModule();
    const [questionnaires] = useQuestionnaires();

    const showDeleteConfirmationDialog = (rowToDelete: UploadsDataItem) => {
        setRowToDelete(rowToDelete);
        setDeleteOpen(true);
    };

    const showCompleteConfirmationDialog = (rowToComplete: UploadsDataItem) => {
        setRowToComplete(rowToComplete);
        setCompleteOpen(true);
    };

    const hideDeleteConfirmationDialog = () => {
        setDeleteOpen(false);
    };

    const hideCompleteConfirmationDialog = () => {
        setCompleteOpen(false);
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

    const getPrimaryAndSecondaryUploadIdsByUploadDataItem = useCallback(
        (uploadDataItem: UploadsDataItem): Id[] => {
            const { primaryFileToDelete, secondaryFileToDelete } = getPrimaryAndSecondaryFilesToDelete(
                uploadDataItem,
                moduleProperties,
                currentModuleAccess.moduleName,
                rows
            );

            return _.compact([primaryFileToDelete?.id, secondaryFileToDelete?.id]);
        },
        [currentModuleAccess.moduleName, rows]
    );

    const isAlreadyMarkedToBeDeleted = useCallback(
        (uploadDataItem: UploadsDataItem): boolean => {
            if (asyncDeletionsState.kind !== "loaded") return false;

            const primaryAndSecondaryIdsToDelete = getPrimaryAndSecondaryUploadIdsByUploadDataItem(uploadDataItem);
            const asyncDeletionsIds = asyncDeletionsState.data.map(({ uploadId }) => uploadId);
            return primaryAndSecondaryIdsToDelete.some(id => asyncDeletionsIds.includes(id));
        },
        [asyncDeletionsState, getPrimaryAndSecondaryUploadIdsByUploadDataItem]
    );

    const hasErrorAsyncDeleting = useCallback(
        (uploadDataItem: UploadsDataItem): boolean => {
            if (asyncDeletionsState.kind !== "loaded") return false;

            const { primaryFileToDelete, secondaryFileToDelete } = getPrimaryAndSecondaryFilesToDelete(
                uploadDataItem,
                moduleProperties,
                currentModuleAccess.moduleName,
                rows
            );

            return (primaryFileToDelete?.errorAsyncDeleting || secondaryFileToDelete?.errorAsyncDeleting) ?? false;
        },
        [asyncDeletionsState.kind, currentModuleAccess.moduleName, rows]
    );

    //Deleting a dataset completely has the following steps*:
    //1. Delete corresponsding datasetValue/event for each row in the file.
    //2. Delete corresponding document from DHIS
    //3. Delete corresponding 'upload' and 'document' from Datastore
    //* If it's a file from a GLASS module with property hasAsyncDeletion === true and the number of rows is greater than maxNumberOfRowsToSyncDeletion,
    // then it is only set to async deletion in Datastore key
    const deleteDataset = () => {
        hideDeleteConfirmationDialog();
        if (!rowToDelete || asyncDeletionsState.kind !== "loaded" || currentModule.kind !== "loaded") return;

        if (
            moduleProperties.get(currentModuleAccess.moduleName)?.hasAsyncDeletion &&
            currentModule.data.maxNumberOfRowsToSyncDeletion &&
            rowToDelete?.rows &&
            rowToDelete?.rows > (currentModule.data.maxNumberOfRowsToSyncDeletion || 0)
        ) {
            if (isAlreadyMarkedToBeDeleted(rowToDelete)) return;

            setToAsyncDeletions([rowToDelete.id]);
            refreshUploads({}); //Trigger re-render of parent
            setLoading(false);
            hideDeleteConfirmationDialog();
        } else {
            const { primaryFileToDelete, secondaryFileToDelete } = getPrimaryAndSecondaryFilesToDelete(
                rowToDelete,
                moduleProperties,
                currentModuleAccess.moduleName,
                rows
            );
            if (primaryFileToDelete) {
                setLoading(true);
                Future.joinObj({
                    primaryArrayBuffer: primaryFileToDelete
                        ? compositionRoot.glassDocuments.downloadAsArrayBuffer(primaryFileToDelete.fileId)
                        : Future.success(undefined),
                    secondaryArrayBuffer: secondaryFileToDelete
                        ? compositionRoot.glassDocuments.downloadAsArrayBuffer(secondaryFileToDelete.fileId)
                        : Future.success(undefined),
                }).run(
                    ({ primaryArrayBuffer, secondaryArrayBuffer }) => {
                        if (primaryFileToDelete && primaryArrayBuffer) {
                            //If the file is in uploaded status then, data values have not been imported.
                            //No need for deletion

                            Future.joinObj({
                                deletePrimaryFileSummary:
                                    primaryFileToDelete.status.toLowerCase() !== "uploaded" ||
                                    !moduleProperties.get(currentModuleAccess.moduleName)?.isDryRunReq
                                        ? compositionRoot.fileSubmission.deletePrimaryFile(
                                              currentModule.data,
                                              primaryFileToDelete,
                                              primaryArrayBuffer
                                          )
                                        : Future.success(undefined),
                                deleteSecondaryFileSummary:
                                    secondaryFileToDelete &&
                                    secondaryFileToDelete.status.toLowerCase() !== "uploaded" &&
                                    secondaryArrayBuffer
                                        ? compositionRoot.fileSubmission.deleteSecondaryFile(
                                              currentModule.data,
                                              secondaryFileToDelete,
                                              secondaryArrayBuffer
                                          )
                                        : Future.success(undefined),
                            }).run(
                                ({ deletePrimaryFileSummary, deleteSecondaryFileSummary }) => {
                                    if (
                                        deletePrimaryFileSummary?.status === "ERROR" ||
                                        deleteSecondaryFileSummary?.status === "ERROR"
                                    ) {
                                        snackbar.error(
                                            "An Error occured deleting the data, exiting. Please try again or contact your administrator."
                                        );
                                        setLoading(false);
                                        return;
                                    }
                                    if (deletePrimaryFileSummary) {
                                        if (
                                            primaryFileToDelete?.status === "COMPLETED" &&
                                            setIsDatasetMarkAsCompleted
                                        ) {
                                            setIsDatasetMarkAsCompleted && setIsDatasetMarkAsCompleted(false);
                                        }
                                        const itemsDeleted =
                                            currentModuleAccess.moduleName === "AMC" ? "products" : "rows";
                                        let message = `${
                                            primaryFileToDelete?.rows || primaryFileToDelete?.records
                                        } ${itemsDeleted} deleted for ${
                                            moduleProperties.get(currentModuleAccess.moduleName)?.primaryFileType
                                        } file`;
                                        if (currentModuleAccess.moduleName === "AMC") {
                                            message = `${
                                                primaryFileToDelete?.rows || primaryFileToDelete?.records
                                            } ${itemsDeleted} deleted for ${
                                                moduleProperties.get(currentModuleAccess.moduleName)?.primaryFileType
                                            } file and its corresponding calculated substance consumption data if any`;
                                        }
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
                                                                hideDeleteConfirmationDialog();
                                                            },
                                                            error => {
                                                                snackbar.error(
                                                                    `Error deleting file, error : ${error} `
                                                                );
                                                                console.error(error);
                                                            }
                                                        );
                                                } else {
                                                    refreshUploads({}); //Trigger re-render of parent
                                                    setLoading(false);
                                                    hideDeleteConfirmationDialog();
                                                }
                                            },
                                            error => {
                                                snackbar.error(`Error deleting file, error : ${error} `);
                                                console.error(error);
                                                setLoading(false);
                                            }
                                        );
                                    }
                                },
                                error => {
                                    snackbar.error(`Error deleting file, error : ${error} `);
                                    console.error(error);
                                    setLoading(false);
                                }
                            );
                        }
                    },
                    error => {
                        console.debug(
                            `Unable to find file/s : ${primaryFileToDelete?.fileName} , ${secondaryFileToDelete?.fileName} , error: ${error}`
                        );
                        snackbar.error(
                            `Unable to find file/s : ${primaryFileToDelete?.fileName} , ${secondaryFileToDelete?.fileName} , error: ${error}`
                        );
                        setLoading(false);
                    }
                );
            } else if (secondaryFileToDelete) {
                setLoading(true);
                compositionRoot.glassDocuments.downloadAsArrayBuffer(secondaryFileToDelete.fileId).run(
                    secondaryArrayBuffer => {
                        if (
                            secondaryFileToDelete &&
                            secondaryFileToDelete.status.toLowerCase() !== "uploaded" &&
                            secondaryArrayBuffer
                        ) {
                            compositionRoot.fileSubmission
                                .deleteSecondaryFile(currentModule.data, secondaryFileToDelete, secondaryArrayBuffer)
                                .run(
                                    deleteSecondaryFileSummary => {
                                        if (deleteSecondaryFileSummary?.status === "ERROR") {
                                            snackbar.error(
                                                "An Error occured deleting the data, exiting. Please try again or contact your administrator."
                                            );
                                            setLoading(false);
                                            return;
                                        }
                                        if (secondaryFileToDelete && deleteSecondaryFileSummary) {
                                            if (
                                                secondaryFileToDelete?.status === "COMPLETED" &&
                                                setIsDatasetMarkAsCompleted
                                            ) {
                                                setIsDatasetMarkAsCompleted && setIsDatasetMarkAsCompleted(false);
                                            }

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
                                                        hideDeleteConfirmationDialog();
                                                        snackbar.info(message);
                                                    },
                                                    error => {
                                                        snackbar.error(`Error deleting file, error : ${error} `);
                                                        console.error(error);
                                                    }
                                                );
                                        }
                                    },
                                    error => {
                                        snackbar.error(`Error deleting file, error : ${error} `);
                                        console.error(error);
                                        setLoading(false);
                                    }
                                );
                        } else {
                            if (secondaryFileToDelete)
                                compositionRoot.glassDocuments.deleteByUploadId(secondaryFileToDelete.id).run(
                                    () => {
                                        refreshUploads({}); //Trigger re-render of parent
                                        setLoading(false);
                                        hideDeleteConfirmationDialog();
                                        snackbar.info("Upload deleted successfully");
                                    },
                                    error => {
                                        snackbar.error(`Error deleting file, error : ${error} `);
                                        console.error(error);
                                    }
                                );
                            else {
                                setLoading(false);
                                snackbar.error("Error deleting file, file not found");
                            }
                        }
                    },
                    error => {
                        snackbar.error(`Unable to download : ${secondaryFileToDelete?.fileName}, error: ${error} `);
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

    const setCompleteStatus = useCallback(() => {
        if (rowToComplete?.id) {
            setLoading(true);
            return compositionRoot.glassUploads.setStatus({ id: rowToComplete.id, status: "COMPLETED" }).run(
                () => {
                    if (
                        moduleProperties.get(currentModuleAccess.moduleName)?.completeStatusChange === "DATASET" ||
                        (moduleProperties.get(currentModuleAccess.moduleName)?.completeStatusChange ===
                            "QUESTIONNAIRE_AND_DATASET" &&
                            questionnaires?.every(q => q.isMandatory && q.isCompleted))
                    ) {
                        return compositionRoot.glassDataSubmission
                            .setStatus(rowToComplete.dataSubmission, "COMPLETE")
                            .run(
                                () => {
                                    setIsDatasetMarkAsCompleted && setIsDatasetMarkAsCompleted(true);
                                    setLoading(false);
                                    refreshUploads({}); //Trigger re-render of parent
                                    setRefetchStatus && setRefetchStatus("COMPLETE");
                                },
                                error => {
                                    snackbar.error(
                                        i18n.t("Error occurred when setting data submission status to COMPLETED")
                                    );
                                    console.debug(
                                        "Error occurred when setting data submission status to COMPLETED: " + error
                                    );
                                    setLoading(false);
                                    setIsDatasetMarkAsCompleted && setIsDatasetMarkAsCompleted(false);
                                }
                            );
                    } else {
                        refreshUploads({}); //Trigger re-render of parent
                        setLoading(false);
                        setIsDatasetMarkAsCompleted && setIsDatasetMarkAsCompleted(false);
                    }
                },
                errorMessage => {
                    snackbar.error(i18n.t(errorMessage));
                    setLoading(false);
                    setIsDatasetMarkAsCompleted && setIsDatasetMarkAsCompleted(false);
                }
            );
        }
    }, [
        compositionRoot,
        currentModuleAccess.moduleName,
        questionnaires,
        refreshUploads,
        rowToComplete,
        setIsDatasetMarkAsCompleted,
        setRefetchStatus,
        snackbar,
    ]);

    const completeDataset = () => {
        hideCompleteConfirmationDialog();
        setCompleteStatus();
    };

    const handleShowImportSummaryErrors = useCallback((row: UploadsDataItem) => {
        if (row.importSummary) {
            setImportSummaryErrorsToShow(row.importSummary);
        }
    }, []);

    return (
        <>
            {rows && currentModule.kind === "loaded" && (
                <StyledTableBody>
                    <TableRow>
                        <TableCell style={{ border: "none", padding: 0 }}>
                            <>
                                <Backdrop open={loading} style={{ color: "#fff", zIndex: 1 }}>
                                    <StyledLoaderContainer>
                                        <CircularProgress color="#fff" size={50} />
                                        <Typography variant="h6">
                                            {rowToDelete ? i18n.t("Deleting Files") : i18n.t("Loading")}
                                        </Typography>
                                        <Typography variant="h5">
                                            {i18n.t(
                                                "This might take several minutes, do not refresh the page or press back."
                                            )}
                                        </Typography>
                                    </StyledLoaderContainer>
                                </Backdrop>
                                <ConfirmationDialog
                                    isOpen={deleteOpen}
                                    title={
                                        moduleProperties.get(currentModuleAccess.moduleName)?.deleteConfirmation.title
                                    }
                                    onSave={deleteDataset}
                                    onCancel={hideDeleteConfirmationDialog}
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
                                <ConfirmationDialog
                                    isOpen={completeOpen}
                                    title={"Review and complete upload"}
                                    onSave={completeDataset}
                                    onCancel={hideCompleteConfirmationDialog}
                                    saveText={i18n.t("Complete")}
                                    cancelText={i18n.t("Cancel")}
                                    fullWidth={true}
                                    disableEnforceFocus
                                >
                                    <DialogContent>
                                        <Typography>
                                            {
                                                "Are you sure you want to complete this upload? Please review the validation reports before completing."
                                            }
                                        </Typography>
                                    </DialogContent>
                                </ConfirmationDialog>
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
                                {currentDataSubmissionStatus.kind === "loaded" &&
                                asyncDeletionsState.kind === "loaded" ? (
                                    <Button
                                        onClick={e => {
                                            e.stopPropagation();
                                            showDeleteConfirmationDialog(row);
                                        }}
                                        disabled={
                                            !hasCurrentUserCaptureAccess ||
                                            !isEditModeStatus(currentDataSubmissionStatus.data.title) ||
                                            isAlreadyMarkedToBeDeleted(row) ||
                                            hasErrorAsyncDeleting(row)
                                        }
                                    >
                                        {isAlreadyMarkedToBeDeleted(row) ? (
                                            i18n.t("Marked to be deleted")
                                        ) : hasErrorAsyncDeleting(row) ? (
                                            i18n.t("There was an error deleting this file. Admin needs to check.")
                                        ) : (
                                            <DeleteOutline />
                                        )}
                                    </Button>
                                ) : (
                                    <CircularProgress size={20} />
                                )}
                            </TableCell>
                            {showComplete && (
                                <TableCell style={{ opacity: 0.5 }}>
                                    {currentDataSubmissionStatus.kind === "loaded" ? (
                                        <Button
                                            onClick={e => {
                                                e.stopPropagation();
                                                showCompleteConfirmationDialog(row);
                                            }}
                                            disabled={
                                                !hasCurrentUserCaptureAccess ||
                                                !isEditModeStatus(currentDataSubmissionStatus.data.title)
                                            }
                                        >
                                            <CheckCircleOutline />
                                        </Button>
                                    ) : (
                                        <CircularProgress size={20} />
                                    )}
                                </TableCell>
                            )}
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
