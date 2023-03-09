import React from "react";
import { TableBody, TableCell, TableRow, Button } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import dayjs from "dayjs";
import { UploadsDataItem } from "../../entities/uploads";
import { CloudDownloadOutlined, DeleteOutline } from "@material-ui/icons";
import { useAppContext } from "../../contexts/app-context";

export interface UploadsTableBodyProps {
    rows?: UploadsDataItem[];
}

export const UploadsTableBody: React.FC<UploadsTableBodyProps> = ({ rows }) => {
    const { compositionRoot } = useAppContext();
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
    return (
        <>
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
                                <Button>
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
