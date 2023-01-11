import React from "react";
import { TableBody, TableCell, TableRow } from "@material-ui/core";
import styled from "styled-components";
import { UploadHistoryItemProps } from "./UploadTable";
import CloudDownloadIcon from "@material-ui/icons/CloudDownload";
import ListIcon from "@material-ui/icons/List";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { useHistory, useLocation } from "react-router-dom";

export interface UploadTableBodyProps {
    rows?: UploadHistoryItemProps[];
}

export const UploadTableBody: React.FC<UploadTableBodyProps> = ({ rows }) => {
    const history = useHistory();
    // TODO: remove the next two lines and create a global hook to get current module
    const location = useLocation().pathname.slice(1);
    const moduleName = location.substring(location.indexOf("/") + 1);

    const handleClick = () => {
        history.push(`/data-submission/${moduleName}`);
    };

    const handleDownload = () => {
        //Handle file download
    };

    return (
        <>
            {rows && rows.length ? (
                <StyledTableBody>
                    {rows.map((row: UploadHistoryItemProps) => (
                        <TableRow key={row.id} onClick={handleClick}>
                            <TableCell>
                                <ListIcon />
                            </TableCell>
                            <TableCell>{row.file_type}</TableCell>
                            <TableCell>{row.country}</TableCell>
                            <TableCell>{row.batch_id}</TableCell>
                            <TableCell>{row.year}</TableCell>
                            <TableCell>{row.start}</TableCell>
                            <TableCell>{row.end}</TableCell>
                            <TableCell>{row.specimens.join(", ")}</TableCell>
                            <TableCell>{row.status}</TableCell>
                            <TableCell>{row.date}</TableCell>
                            <TableCell>{row.filename}</TableCell>
                            <TableCell>
                                <CloudDownloadIcon color="error" onClick={handleDownload} />
                            </TableCell>
                            <TableCell>{row.input_line_nb}</TableCell>
                            <TableCell>{row.output_line_nb}</TableCell>
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
