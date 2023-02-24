import React from "react";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import styled from "styled-components";
import VisibilityIcon from "@material-ui/icons/Visibility";
import i18n from "@eyeseetea/d2-ui-components/locales";

export interface NonBlockingWarningsProps {
    rows: Map<string, number>;
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
                        {[...rows].map(key => (
                            <TableRow key={key[0]}>
                                <TableCell align="left" className="text-gold">
                                    {key[0]}
                                </TableCell>
                                <TableCell>{key[1]}</TableCell>
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
