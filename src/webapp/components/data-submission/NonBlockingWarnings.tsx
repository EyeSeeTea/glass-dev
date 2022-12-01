import React, { useState } from "react";
import { Button, CircularProgress, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import { DataSubmissionNav } from "./DataSubmissionNav";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import styled from "styled-components";
import VisibilityIcon from '@material-ui/icons/Visibility';


function createData(name: string, count: number ) {
    return { name, count };
}

const rows = [
    createData('AGG- BUG- DRUG combinations', 247),
    createData('AGG- Specimen-pathogen combinations', 124)
];

export const NonBlockingWarnings: React.FC = () => {

    return (
        <ContentWrapper>            
            <Typography variant="h3">Non-blocking warnings</Typography>
            
            <TableContainer component={Paper}>
                <Table className={'blocking-table'} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Count</TableCell>
                            <TableCell>Details</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.name}>
                                <TableCell align="left">
                                    {row.name}
                                </TableCell>
                                <TableCell>{row.count}</TableCell>
                                <TableCell
                                ><VisibilityIcon /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </ContentWrapper>
    )

}

const ContentWrapper = styled.div`
    > h3 {
        font-size: 21px;
        margin-bottom: 15px;
        color: ${palette.text.primary};
    }
    .MuiTableContainer-root {
        border: none;
        box-shadow: none;
    }
    .MuiTableRow-head {
        border-bottom: 3px solid ${glassColors.greyLight};
        th {
            color: ${glassColors.grey};
            font-weight: 400;
            font-size: 15px;
        }
    }

    .MuiTableBody-root {
        tr {
            border: none;
            td {
                border-bottom: 1px solid ${glassColors.greyLight};
            }
            td:nth-child(1) {
                color: ${glassColors.gold}
            }
            td:nth-child(3) {
                width: 40px;
                text-align: center;
                opacity: .6;
                &:hover {
                    opacity: 1;
                }
            }
        }
    }
`