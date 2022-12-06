import React from "react";
import { TableBody, TableCell, TableRow } from "@material-ui/core";
import styled from "styled-components";
import { UploadsDataItemProps } from "./UploadsTable";
import i18n from "@eyeseetea/d2-ui-components/locales";

export interface UploadsTableBodyProps {
    rows?: UploadsDataItemProps[];
}

export const UploadsTableBody: React.FC<UploadsTableBodyProps> = ({
    rows }) => {

    return (
        <>
            {(rows && rows.length) ?
                <StyledTableBody>
                    {rows.map((row:UploadsDataItemProps) => (
                        <TableRow key={row.id}>
                            <TableCell>{row.uploaded_date}</TableCell>
                            <TableCell>{row.date_first}</TableCell>
                            <TableCell>{row.date_last}</TableCell>
                            <TableCell>{row.records}</TableCell>
                            <TableCell>{row.type}</TableCell>
                            <TableCell>{row.batch_id}</TableCell>
                            <TableCell>{i18n.t(row.status)}</TableCell>
                        </TableRow>
                    ))}
                </StyledTableBody>
                :
                <p>No data found...</p>
            }
        </>
    );
};

const StyledTableBody = styled(TableBody)``;
