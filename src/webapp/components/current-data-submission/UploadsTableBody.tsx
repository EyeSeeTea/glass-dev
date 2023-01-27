import React from "react";
import { TableBody, TableCell, TableRow } from "@material-ui/core";
import styled from "styled-components";
import { UploadsDataItemProps } from "./UploadsTable";
import i18n from "@eyeseetea/d2-ui-components/locales";
import dayjs from "dayjs";

export interface UploadsTableBodyProps {
    rows?: UploadsDataItemProps[];
}

export const UploadsTableBody: React.FC<UploadsTableBodyProps> = ({ rows }) => {
    return (
        <>
            {rows && rows.length ? (
                <StyledTableBody>
                    {rows.map((row: UploadsDataItemProps) => (
                        <TableRow key={row.id}>
                            <TableCell>{dayjs(row.submissionDate).format("DD-MM-YYYY")}</TableCell>
                            <TableCell>{row.period}</TableCell>
                            <TableCell>{row.inputLineNb}</TableCell>
                            <TableCell>{row.fileType}</TableCell>
                            <TableCell>{row.batchId}</TableCell>
                            <TableCell>{i18n.t(row.status).toUpperCase()}</TableCell>
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
