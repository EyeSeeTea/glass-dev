import React from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { ConsistencyError } from "../../../domain/entities/data-entry/ImportSummary";

interface BlockingErrorsProps {
    rows: ConsistencyError[];
}
export const BlockingErrors: React.FC<BlockingErrorsProps> = ({ rows }) => {
    return (
        <ContentWrapper>
            <Typography variant="h3">{i18n.t("Blocking Errors")}</Typography>

            <TableContainer component={Paper}>
                <Table className={"blocking-table"} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>{i18n.t("Name")}</TableCell>
                            <TableCell>{i18n.t("Count")}</TableCell>
                            <TableCell>{i18n.t("Lines")}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(row => {
                            return (
                                <TableRow key={row.error}>
                                    <TableCell align="left">{row.error}</TableCell>
                                    <TableCell>{row.count}</TableCell>
                                    <TableCell>{row.lines?.join(", ") || "-"}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
