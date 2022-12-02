import React from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import styled from "styled-components";
import VisibilityIcon from "@material-ui/icons/Visibility";

function createData(name: string, count: number) {
    return { name, count };
}

const rows = [createData("AGG- BUG- DRUG combinations", 247), createData("AGG- Specimen-pathogen combinations", 124)];

export const UploadsTables: React.FC = () => {
    return (
        <ContentWrapper>
            <Typography variant="h3">Table Title here</Typography>

            <TableContainer component={Paper}>
                <Table className={"blocking-table"} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Column 1</TableCell>
                            <TableCell>Column 2</TableCell>
                            <TableCell>Column 3</TableCell>
                            <TableCell>Column 4</TableCell>
                            <TableCell>Column 5</TableCell>
                            <TableCell>Column 6</TableCell>
                            <TableCell>Column 7</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(row => (
                            <TableRow key={row.name}>
                                <TableCell align="left">{row.name}</TableCell>
                                <TableCell>col 2</TableCell>
                                <TableCell>col 3</TableCell>
                                <TableCell>col 4</TableCell>
                                <TableCell>col 5</TableCell>
                                <TableCell>col 6</TableCell>
                                <TableCell>col 7</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
