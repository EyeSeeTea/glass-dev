import React, { useState } from "react";
import { TableBody, TableCell, TableRow, Button } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import dayjs from "dayjs";
import { UploadsDataItem } from "../../entities/uploads";
import { CloudDownloadOutlined, DeleteOutline } from "@material-ui/icons";
import { useAppContext } from "../../contexts/app-context";
import { useSnackbar } from "@eyeseetea/d2-ui-components";
import { CircularProgress } from "material-ui";

export interface UploadsTableBodyProps {
    rows?: UploadsDataItem[];
    refreshUploads: React.Dispatch<React.SetStateAction<{}>>;
}

export const UploadsTableBody: React.FC<UploadsTableBodyProps> = ({ rows, refreshUploads }) => {
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();
    const [loading, setLoading] = useState<boolean>(false);

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

    const deleteDataset = (uploadId: string, fileId: string, fileName: string) => {
        //Deleting a dataset completely has the following steps:
        //1. Delete corresponding 'upload' and 'document' from Datastore
        //2. Delete corresponding file from DHIS
        //3. Delete corresponsding datasetValue for each row in the file.
        setLoading(true);
        compositionRoot.glassDocuments.deleteByUploadId(uploadId).run(
            _data => {
                refreshUploads({}); //Trigger re-render of parent
                setLoading(false);
            },
            errorMessage => {
                snackbar.error(errorMessage);
                setLoading(false);
            }
        );
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
                                <Button onClick={() => deleteDataset(row.id, row.fileId, row.fileName)}>
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
