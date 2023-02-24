import React from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";

interface BlockingErrorsProps {
    rows: Map<string, number>;
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
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {[...rows].map((value, key) => {
                            return (
                                <TableRow key={key}>
                                    <TableCell align="left">{value}</TableCell>
                                    <TableCell>{key}</TableCell>
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
