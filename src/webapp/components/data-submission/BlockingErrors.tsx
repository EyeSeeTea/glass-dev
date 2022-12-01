import React from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import styled from "styled-components";
import VisibilityIcon from "@material-ui/icons/Visibility";

function createData(name: string, count: number) {
    return { name, count };
}

const rows = [createData("AGG- BUG- DRUG combinations", 247), createData("AGG- Specimen-pathogen combinations", 124)];

export const BlockingErrors: React.FC = () => {
    return (
        <ContentWrapper>
            <Typography variant="h3">Blocking Errors</Typography>

            <TableContainer component={Paper}>
                <Table className={"blocking-table"} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Count</TableCell>
                            <TableCell>Details</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(row => (
                            <TableRow key={row.name}>
                                <TableCell align="left">{row.name}</TableCell>
                                <TableCell>{row.count}</TableCell>
                                <TableCell>
                                    <VisibilityIcon />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
