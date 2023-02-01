import React from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import styled from "styled-components";
import VisibilityIcon from "@material-ui/icons/Visibility";
import i18n from "@eyeseetea/d2-ui-components/locales";

function createData(name: string, count: number) {
    return { name, count };
}

const rows = [createData("AGG- BUG- DRUG combinations", 247), createData("AGG- Specimen-pathogen combinations", 124)];

export const NonBlockingWarnings: React.FC = () => {
    return (
        <ContentWrapper>
            <Typography variant="h3">{i18n.t("Non-blocking warnings")}</Typography>

            <TableContainer component={Paper}>
                <Table className={"blocking-table"} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>{i18n.t("Name")}</TableCell>
                            <TableCell>{i18n.t("Count")}</TableCell>
                            <TableCell>{i18n.t("Details")}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(row => (
                            <TableRow key={row.name}>
                                <TableCell align="left" className="text-gold">
                                    {row.name}
                                </TableCell>
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

const ContentWrapper = styled.div`
    .text-gold {
        color: ${glassColors.gold} !important;
    }
`;
