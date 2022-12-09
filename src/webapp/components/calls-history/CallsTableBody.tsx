import React from "react";
import { TableBody, TableCell, TableRow } from "@material-ui/core";
import styled from "styled-components";
import { UploadsDataItemProps } from "./CallsTable";

export interface CallsTableBodyProps {
    rows?: UploadsDataItemProps[];
}

export const CallsTableBody: React.FC<CallsTableBodyProps> = ({ rows }) => {
    return (
        <>
            {rows && rows.length ? (
                <StyledTableBody>
                    {rows.map((row: UploadsDataItemProps) => (
                        <TableRow key={row.id}>
                            <TableCell>{row.uploaded_date}</TableCell>
                            <TableCell>{row.date_first}</TableCell>
                            <TableCell>{row.date_last}</TableCell>
                            <TableCell>{row.records}</TableCell>
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
