import React, { useCallback, useState } from "react";
import { useAppContext } from "../../../contexts/app-context";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { useCurrentOrgUnitContext } from "../../../contexts/current-orgUnit-context";
import { ImportOptions, ImportSummaryErrors } from "../../../../domain/entities/data-entry/ImportSummary";
import { UploadsDataItem } from "../../../entities/uploads";
import { moduleProperties } from "../../../../domain/utils/ModuleProperties";
import { Future } from "../../../../domain/entities/Future";
import { useCurrentModuleContext } from "../../../contexts/current-module-context";

export function useDatasets(refreshUploads: React.Dispatch<React.SetStateAction<{}>>, rows?: UploadsDataItem[]) {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const [loading, setLoading] = useState<boolean>(false);
    const {
        currentOrgUnitAccess: { orgUnitId, orgUnitName },
    } = useCurrentOrgUnitContext();
    const { currentModuleAccess } = useCurrentModuleContext();
    const [open, setOpen] = useState(false);
    const [importSummaryErrorsToShow, setImportSummaryErrorsToShow] = useState<ImportSummaryErrors | null>(null);
    const [rowToDelete, setRowToDelete] = useState<UploadsDataItem>();

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

    const deletePrimaryAndSecondaryFile = (
        primaryFileToDelete: UploadsDataItem,
        secondaryFileToDelete: UploadsDataItem | undefined
    ) => {
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

                    const baseOptions: Omit<ImportOptions, "batchId" | "period" | "countryCode" | "eventListId"> = {
                        moduleName: currentModuleAccess.moduleName,
                        action: "DELETE",
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
                                const itemsDeleted = currentModuleAccess.moduleName === "AMC" ? "products" : "rows";

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
                                            moduleProperties.get(currentModuleAccess.moduleName)?.secondaryFileType
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
    };

    const deleteSecondaryFile = (secondaryFileToDelete: UploadsDataItem) => {
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
                        action: "DELETE",
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
                                    compositionRoot.glassDocuments.deleteByUploadId(secondaryFileToDelete.id).run(
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
    };

    const getFilesToDelete = (
        rowToDelete: UploadsDataItem
    ): { primaryFileToDelete: UploadsDataItem | undefined; secondaryFileToDelete: UploadsDataItem | undefined } => {
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
                return {
                    primaryFileToDelete: rowToDelete,
                    secondaryFileToDelete: rows
                        ?.filter(sample => sample.correspondingRisUploadId === rowToDelete.id)
                        ?.at(0),
                };
            } else {
                return {
                    secondaryFileToDelete: rowToDelete,
                    primaryFileToDelete: rows?.filter(ris => ris.id === rowToDelete.correspondingRisUploadId)?.at(0),
                };
            }
        } else if (!moduleProperties.get(currentModuleAccess.moduleName)?.isSecondaryRelated) {
            if (rowToDelete.fileType === moduleProperties.get(currentModuleAccess.moduleName)?.primaryFileType) {
                return {
                    primaryFileToDelete: rowToDelete,
                    secondaryFileToDelete: undefined,
                };
            } else {
                return {
                    primaryFileToDelete: undefined,
                    secondaryFileToDelete: rowToDelete,
                };
            }
        } else {
            return {
                primaryFileToDelete: rowToDelete,
                secondaryFileToDelete: undefined,
            };
        }
    };

    //Deleting a dataset completely has the following steps:
    //1. Delete corresponsding datasetValue/event for each row in the file.
    //2. Delete corresponding document from DHIS
    //3. Delete corresponding 'upload' and 'document' from Datastore
    const deleteDataset = () => {
        hideConfirmationDialog();
        if (rowToDelete) {
            const { primaryFileToDelete, secondaryFileToDelete } = getFilesToDelete(rowToDelete);

            if (primaryFileToDelete) {
                deletePrimaryAndSecondaryFile(primaryFileToDelete, secondaryFileToDelete);
            } else if (secondaryFileToDelete) {
                deleteSecondaryFile(secondaryFileToDelete);
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

    return {
        loading,
        open,
        importSummaryErrorsToShow,
        showConfirmationDialog,
        downloadFile,
        deleteDataset,
        handleShowImportSummaryErrors,
        hideConfirmationDialog,
        setImportSummaryErrorsToShow,
    };
}
