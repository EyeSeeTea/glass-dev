import React, { useState } from "react";
import { Backdrop, TableBody, TableCell, TableRow, Button, DialogContent, Typography } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import dayjs from "dayjs";
import { UploadsDataItem } from "../../entities/uploads";
import { CloudDownloadOutlined, DeleteOutline } from "@material-ui/icons";
import { useAppContext } from "../../contexts/app-context";
import { ConfirmationDialog, useSnackbar } from "@eyeseetea/d2-ui-components";
import { CircularProgress } from "material-ui";
import { useCurrentOrgUnitContext } from "../../contexts/current-orgUnit-context";
import { Future } from "../../../domain/entities/Future";
import { isEditModeStatus } from "../../utils/editModeStatus";
import { useStatusDataSubmission } from "../../hooks/useStatusDataSubmission";
import { useCurrentModuleContext } from "../../contexts/current-module-context";
import { useLocation } from "react-router-dom";
import { useGlassCaptureAccess } from "../../hooks/useGlassCaptureAccess";
import { StyledLoaderContainer } from "../upload/ConsistencyChecks";

export interface UploadsTableBodyProps {
    rows?: UploadsDataItem[];
    refreshUploads: React.Dispatch<React.SetStateAction<{}>>;
}

export const UploadsTableBody: React.FC<UploadsTableBodyProps> = ({ rows, refreshUploads }) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const [loading, setLoading] = useState<boolean>(false);
    const {
        currentOrgUnitAccess: { orgUnitId },
    } = useCurrentOrgUnitContext();
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
        hideConfirmationDialog();
        if (rowToDelete) {
            let risFileToDelete: UploadsDataItem | undefined, sampleFileToDelete: UploadsDataItem | undefined;
            //Ris file is mandatory, so there will be a ris file with given batch id.
            //Sample file is optional and could be absent
            if (rowToDelete.fileType === "RIS") {
                risFileToDelete = rowToDelete;
                sampleFileToDelete = rows
                    ?.filter(sample => sample.correspondingRisFileUploadId === rowToDelete.id)
                    ?.at(0);
            } else {
                sampleFileToDelete = rowToDelete;
                risFileToDelete = rows?.filter(ris => ris.id === rowToDelete.correspondingRisFileUploadId)?.at(0);
            }

            if (risFileToDelete) {
                setLoading(true);
                Future.joinObj({
                    risFileDownload: compositionRoot.glassDocuments.download(risFileToDelete.fileId),
                    sampleFileDownload: sampleFileToDelete
                        ? compositionRoot.glassDocuments.download(sampleFileToDelete.fileId)
                        : Future.success(undefined),
                }).run(
                    ({ risFileDownload, sampleFileDownload }) => {
                        if (risFileToDelete) {
                            const risFile = new File([risFileDownload], risFileToDelete.fileName);
                            //If the file is in uploaded status then, data vales have not been imported.
                            //No need for deletion

                            Future.joinObj({
                                deleteRisFileSummary:
                                    risFileToDelete.status.toLowerCase() !== "uploaded"
                                        ? compositionRoot.dataSubmision.RISFile(
                                              risFile,
                                              risFileToDelete.batchId,
                                              parseInt(risFileToDelete.period),
                                              "DELETES",
                                              orgUnitId,
                                              risFileToDelete.countryCode,
                                              false
                                          )
                                        : Future.success(undefined),
                                deleteSampleFileSummary:
                                    sampleFileToDelete &&
                                    sampleFileToDelete.status.toLowerCase() !== "uploaded" &&
                                    sampleFileDownload
                                        ? compositionRoot.dataSubmision.sampleFile(
                                              new File([sampleFileDownload], sampleFileToDelete.fileName),
                                              sampleFileToDelete.batchId,
                                              parseInt(sampleFileToDelete.period),
                                              "DELETES",
                                              orgUnitId,
                                              sampleFileToDelete.countryCode,
                                              false
                                          )
                                        : Future.success(undefined),
                            }).run(
                                ({ deleteRisFileSummary, deleteSampleFileSummary }) => {
                                    if (deleteRisFileSummary) {
                                        let message = `${deleteRisFileSummary.importCount.deleted} data values deleted for RIS file`;

                                        if (sampleFileToDelete && deleteSampleFileSummary) {
                                            message =
                                                message +
                                                ` and ${deleteSampleFileSummary.importCount.deleted} data values deleted for SAMPLE file.`;
                                        }

                                        snackbar.info(message);
                                    }
                                    if (risFileToDelete) {
                                        compositionRoot.glassDocuments.deleteByUploadId(risFileToDelete.id).run(
                                            () => {
                                                if (sampleFileToDelete) {
                                                    compositionRoot.glassDocuments
                                                        .deleteByUploadId(sampleFileToDelete.id)
                                                        .run(
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
                                    }
                                },
                                error => {
                                    snackbar.error(error);
                                }
                            );
                        }
                    },
                    error => {
                        console.debug(
                            `Unable to download RIS fileid : ${risFileToDelete?.fileId} OR Sample fileid : ${sampleFileToDelete?.fileId}, error: ${error} `
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
            <Backdrop open={loading} style={{ color: "#fff", zIndex: 1 }}>
                <StyledLoaderContainer>
                    <CircularProgress color="#fff" size={50} />
                    <Typography variant="h6">{i18n.t("Deleting Files")}</Typography>
                    <Typography variant="h5">
                        {i18n.t("This might take several minutes, do not refresh the page or press back.")}
                    </Typography>
                </StyledLoaderContainer>
            </Backdrop>

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
            </ConfirmationDialog>
            {rows && rows.length ? (
                <StyledTableBody>
                    {rows.map((row: UploadsDataItem) => (
                        <TableRow key={row.id}>
                            <TableCell>{dayjs(row.uploadDate).format("DD-MM-YYYY")}</TableCell>
                            <TableCell>{row.period}</TableCell>
                            <TableCell>{row.records}</TableCell>
                            <TableCell>{row.fileType}</TableCell>
                            <TableCell>{row.batchId}</TableCell>
                            <TableCell>{i18n.t(row.status).toUpperCase()}</TableCell>
                            <TableCell>
                                <Button onClick={() => downloadFile(row.fileId, row.fileName)}>
                                    <CloudDownloadOutlined />
                                </Button>
                            </TableCell>
                            <TableCell>
                                {currentDataSubmissionStatus.kind === "loaded" ? (
                                    <Button
                                        onClick={() => showConfirmationDialog(row)}
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
