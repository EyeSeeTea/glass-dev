import React from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { ConsistencyError } from "../../../domain/entities/data-entry/ImportSummary";
interface NonBlockingWarningsProps {
    rows: ConsistencyError[];
}
export const NonBlockingWarnings: React.FC<NonBlockingWarningsProps> = ({ rows }) => {
    return (
        <ContentWrapper>
            <Typography variant="h3">{i18n.t("Non-blocking warnings")}</Typography>

            <TableContainer component={Paper}>
                <Table className={"blocking-table"} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>{i18n.t("Name")}</TableCell>
                            <TableCell>{i18n.t("Count")}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(row => (
                            <TableRow key={row.error}>
                                <TableCell align="left" className="text-gold">
                                    {row.error}
                                </TableCell>
                                <TableCell>{row.count}</TableCell>
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
