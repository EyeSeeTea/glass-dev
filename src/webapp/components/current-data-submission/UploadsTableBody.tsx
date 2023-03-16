import React, { useState } from "react";
import { TableBody, TableCell, TableRow, Button, DialogContent, Typography, DialogActions } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import dayjs from "dayjs";
import { UploadsDataItem } from "../../entities/uploads";
import { CloudDownloadOutlined, DeleteOutline } from "@material-ui/icons";
import { useAppContext } from "../../contexts/app-context";
import { ConfirmationDialog, useSnackbar } from "@eyeseetea/d2-ui-components";
import { CircularProgress } from "material-ui";

export interface UploadsTableBodyProps {
    rows?: UploadsDataItem[];
    refreshUploads: React.Dispatch<React.SetStateAction<{}>>;
}

export const UploadsTableBody: React.FC<UploadsTableBodyProps> = ({ rows, refreshUploads }) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const [loading, setLoading] = useState<boolean>(false);
    const [open, setOpen] = React.useState(false);
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

    const deleteRisFile = (uploadId: string, file: Blob, fileName: string, batchId: string, period: string) => {
        const risFile = new File([file], fileName);
        compositionRoot.dataSubmision.RISFile(risFile, batchId, parseInt(period), "DELETES").run(
            summary => {
                snackbar.info(`${summary.importCount.deleted} records deleted.`);
                compositionRoot.glassDocuments.deleteByUploadId(uploadId).run(
                    _data => {
                        refreshUploads({}); //Trigger re-render of parent
                        setLoading(false);
                        hideConfirmationDialog();
                    },
                    errorMessage => {
                        snackbar.error(errorMessage);
                        setLoading(false);
                        hideConfirmationDialog();
                    }
                );
            },
            error => {
                snackbar.error(error);
            }
        );
    };

    const deleteSampleFile = (uploadId: string, file: Blob, fileName: string, batchId: string, period: string) => {
        const sampleFile = new File([file], fileName);
        compositionRoot.dataSubmision.sampleFile(sampleFile, batchId, parseInt(period), "DELETES").run(
            summary => {
                snackbar.info(`${summary.importCount.deleted} records deleted.`);
                compositionRoot.glassDocuments.deleteByUploadId(uploadId).run(
                    _data => {
                        refreshUploads({}); //Trigger re-render of parent
                        setLoading(false);
                        hideConfirmationDialog();
                    },
                    errorMessage => {
                        snackbar.error(errorMessage);
                        setLoading(false);
                        hideConfirmationDialog();
                    }
                );
            },
            error => {
                snackbar.error(error);
            }
        );
    };

    const deleteDataset = () => {
        //Deleting a dataset completely has the following steps:
        //1. Delete corresponsding datasetValue for each row in the file.
        //2. Delete corresponding document from DHIS
        //3. Delete corresponding 'upload' and 'document' from Datastore
        if (rowToDelete) {
            setLoading(true);

            compositionRoot.glassDocuments.download(rowToDelete.fileId).run(
                file => {
                    if (rowToDelete.fileType === "RIS") {
                        deleteRisFile(
                            rowToDelete?.id,
                            file,
                            rowToDelete.fileName,
                            rowToDelete.batchId,
                            rowToDelete.period
                        );
                        //check if corresponding sample file is uploaded, delete that too.
                        const correspondingSample = rows
                            ?.filter(
                                upload =>
                                    upload.batchId === rowToDelete.batchId &&
                                    upload.fileType === "SAMPLE" &&
                                    upload.period === rowToDelete.period
                            )
                            ?.at(0);
                        if (correspondingSample)
                            compositionRoot.glassDocuments.download(correspondingSample.fileId).run(
                                sampleFile => {
                                    deleteSampleFile(
                                        correspondingSample.id,
                                        sampleFile,
                                        correspondingSample.fileName,
                                        rowToDelete.batchId,
                                        rowToDelete.period
                                    );
                                },
                                () => {}
                            );
                    } else if (rowToDelete.fileType === "SAMPLE") {
                        deleteSampleFile(
                            rowToDelete.id,
                            file,
                            rowToDelete.fileName,
                            rowToDelete.batchId,
                            rowToDelete.period
                        );
                        //check if corresponding RIS file is uploaded, delete that too.
                        const correspondingRIS = rows
                            ?.filter(
                                upload =>
                                    upload.batchId === rowToDelete.batchId &&
                                    upload.fileType === "RIS" &&
                                    upload.period === rowToDelete.period
                            )
                            ?.at(0);
                        if (correspondingRIS)
                            compositionRoot.glassDocuments.download(correspondingRIS.fileId).run(
                                risFile => {
                                    deleteRisFile(
                                        correspondingRIS.id,
                                        risFile,
                                        correspondingRIS.fileName,
                                        rowToDelete.batchId,
                                        rowToDelete.period
                                    );
                                },
                                () => {}
                            );
                    }
                },
                () => {}
            );
        }
    };
    return (
        <>
            {loading && (
                <TableRow>
                    <TableCell>
                        <CircularProgress size={25} />
                    </TableCell>
                </TableRow>
            )}
            <ConfirmationDialog
                isOpen={open}
                title={i18n.t("Confirm Delete")}
                onSave={deleteDataset}
                onCancel={hideConfirmationDialog}
                saveText={i18n.t("Ok")}
                cancelText={i18n.t("Cancel")}
                fullWidth={true}
                disableEnforceFocus
            >
                <DialogContent>
                    <Typography>
                        {i18n.t(
                            "Deleting this upload will delete both SAMPLE and RIS files for the given dataset. Are you sure you want to delete?"
                        )}
                    </Typography>
                </DialogContent>
                <DialogActions>{loading && <CircularProgress size={25} />}</DialogActions>
            </ConfirmationDialog>
            {rows && rows.length ? (
                <StyledTableBody>
                    {rows.map((row: UploadsDataItem) => (
                        <TableRow key={row.id}>
                            <TableCell>{dayjs(row.uploadDate).format("DD-MM-YYYY")}</TableCell>
                            <TableCell>{row.period}</TableCell>
                            <TableCell>{row.inputLineNb}</TableCell>
                            <TableCell>{row.fileType}</TableCell>
                            <TableCell>{row.batchId}</TableCell>
                            <TableCell>{i18n.t(row.status).toUpperCase()}</TableCell>
                            <TableCell>
                                <Button onClick={() => downloadFile(row.fileId, row.fileName)}>
                                    <CloudDownloadOutlined />
                                </Button>
                            </TableCell>
                            <TableCell>
                                <Button onClick={() => showConfirmationDialog(row)}>
                                    <DeleteOutline />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </StyledTableBody>
            ) : (
                <p>No data found...</p>
            )}
        </>
    );
};

const StyledTableBody = styled(TableBody)``;
