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
import { Future } from "../../../domain/entities/Future";
import { isEditModeStatus } from "../../utils/editModeStatus";
import { useStatusDataSubmission } from "../../hooks/useStatusDataSubmission";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { useLocation } from "react-router-dom";
import { useGlassCaptureAccess } from "../../hooks/useGlassCaptureAccess";

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
    const location = useLocation();
    const queryParameters = new URLSearchParams(location.search);
    const periodFromUrl = parseInt(queryParameters.get("period") || "");
    const year = periodFromUrl || new Date().getFullYear() - 1;

    const { currentModuleAccess } = useCurrentModuleContext();
    const { currentOrgUnitAccess } = useCurrentOrgUnitContext();
    const currentDataSubmissionStatus = useStatusDataSubmission(
        currentModuleAccess.moduleId,
        currentOrgUnitAccess.orgUnitId,
        year
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
    //1. Delete corresponsding datasetValue for each row in the file.
    //2. Delete corresponding document from DHIS
    //3. Delete corresponding 'upload' and 'document' from Datastore
    const deleteDataset = () => {
        if (rowToDelete) {
            //Ris file is mandatory, so there will be a ris file with given batch id.
            const risFileToDelete = rows
                ?.filter(
                    ris =>
                        ris.batchId === rowToDelete.batchId &&
                        ris.fileType === "RIS" &&
                        ris.period === rowToDelete.period
                )
                ?.at(0);
            //Sample file is optional and could be absent
            const sampleFileToDelete = rows
                ?.filter(
                    sample =>
                        sample.batchId === rowToDelete.batchId &&
                        sample.fileType === "SAMPLE" &&
                        sample.period === rowToDelete.period
                )
                ?.at(0);

            if (risFileToDelete) {
                setLoading(true);
                Future.joinObj({
                    risFileDownload: compositionRoot.glassDocuments.download(risFileToDelete.fileId),
                    sampleFileDownload: sampleFileToDelete
                        ? compositionRoot.glassDocuments.download(sampleFileToDelete.fileId)
                        : Future.success(undefined),
                }).run(
                    ({ risFileDownload, sampleFileDownload }) => {
                        const risFile = new File([risFileDownload], risFileToDelete.fileName);

                        Future.joinObj({
                            deleteRisFileSummary: compositionRoot.dataSubmision.RISFile(
                                risFile,
                                risFileToDelete.batchId,
                                parseInt(risFileToDelete.period),
                                risFileToDelete.countryCode,
                                "DELETES"
                            ),
                            deleteSampleFileSummary:
                                sampleFileToDelete && sampleFileDownload
                                    ? compositionRoot.dataSubmision.sampleFile(
                                          new File([sampleFileDownload], sampleFileToDelete.fileName),
                                          sampleFileToDelete.batchId,
                                          parseInt(sampleFileToDelete.period),
                                          sampleFileToDelete.countryCode,
                                          "DELETES"
                                      )
                                    : Future.success(undefined),
                        }).run(
                            ({ deleteRisFileSummary, deleteSampleFileSummary }) => {
                                let message = `${deleteRisFileSummary.importCount.deleted} records deleted for RIS file`;

                                if (sampleFileToDelete && deleteSampleFileSummary) {
                                    message =
                                        message +
                                        ` and ${deleteSampleFileSummary.importCount.deleted} records deleted for SAMPLE file.`;
                                }

                                snackbar.info(message);

                                compositionRoot.glassDocuments.deleteByUploadId(risFileToDelete.id).run(
                                    () => {
                                        if (sampleFileToDelete) {
                                            compositionRoot.glassDocuments.deleteByUploadId(sampleFileToDelete.id).run(
                                                () => {
                                                    refreshUploads({}); //Trigger re-render of parent
                                                    setLoading(false);
                                                    hideConfirmationDialog();
                                                },
                                                error => {
                                                    snackbar.error(error);
                                                }
                                            );
                                        } else {
                                            refreshUploads({}); //Trigger re-render of parent
                                            setLoading(false);
                                            hideConfirmationDialog();
                                        }
                                    },
                                    error => {
                                        snackbar.error(error);
                                    }
                                );
                            },
                            error => {
                                snackbar.error(error);
                            }
                        );
                    },
                    error => {
                        console.debug(
                            `Unable to download RIS fileid : ${risFileToDelete.fileId} OR Sample fileid : ${sampleFileToDelete?.fileId}, error: ${error} `
                        );
                    }
                );
            } else {
                //RIS file doesnt exist, only sample file exists. This should never happen as RIS file is mandatory.
                snackbar.error("Mandatory RIS file does not exist.");
            }
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
                                {currentDataSubmissionStatus.kind === "loaded" && (
                                    <Button
                                        onClick={() => showConfirmationDialog(row)}
                                        disabled={
                                            !hasCurrentUserCaptureAccess ||
                                            !isEditModeStatus(currentDataSubmissionStatus.data.title)
                                        }
                                    >
                                        <DeleteOutline />
                                    </Button>
                                )}
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
