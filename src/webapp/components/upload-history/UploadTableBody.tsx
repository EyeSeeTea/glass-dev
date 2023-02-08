import React from "react";
import { TableBody, TableCell, TableRow } from "@material-ui/core";
import styled from "styled-components";
import { UploadHistoryItemProps } from "./UploadTable";
import CloudDownloadIcon from "@material-ui/icons/CloudDownload";
import ListIcon from "@material-ui/icons/List";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { useHistory, useLocation } from "react-router-dom";
import dayjs from "dayjs";

export interface UploadTableBodyProps {
    rows?: UploadHistoryItemProps[];
}

export const UploadTableBody: React.FC<UploadTableBodyProps> = ({ rows }) => {
    const history = useHistory();
    // TODO: remove the next two lines and create a global hook to get current module
    const location = useLocation().pathname.slice(1);
    const moduleName = location.substring(location.indexOf("/") + 1);

    const click = () => {
        history.push(`/upload/?module=${moduleName}`);
    };

    const download = (_url: string) => {
        // TODO: add usecase for filedownload
    };

    return (
        <>
            {rows && rows.length ? (
                <StyledTableBody>
                    {rows.map((row: UploadHistoryItemProps) => (
                        <TableRow key={row.id} onClick={click}>
                            <TableCell>
                                <ListIcon />
                            </TableCell>
                            <TableCell>{row.fileType}</TableCell>
                            <TableCell>{row.countryCode.toUpperCase()}</TableCell>
                            <TableCell>{row.batchId}</TableCell>
                            <TableCell>{row.period}</TableCell>
                            <TableCell>{row.specimens.join(", ")}</TableCell>
                            <TableCell>{row.status}</TableCell>
                            <TableCell>{dayjs(row.uploadDate).format("YYYY-MM-DD HH:mm:ss")}</TableCell>
                            <TableCell>{row.fileName}</TableCell>
                            <TableCell>
                                <CloudDownloadIcon color="error" onClick={() => download(row.fileId)} />
                            </TableCell>
                            <TableCell>{row.inputLineNb}</TableCell>
                            <TableCell>{row.outputLineNb}</TableCell>
                        </TableRow>
                    ))}
                </StyledTableBody>
            ) : (
                <p>No data found...</p>
            )}
        </>
    );
};

const StyledTableBody = styled(TableBody)`
    td.cta {
        text-align: center;
        svg {
            color: ${glassColors.grey};
        }
        &:hover {
            svg {
                color: ${glassColors.greyBlack};
            }
        }
    }
`;
