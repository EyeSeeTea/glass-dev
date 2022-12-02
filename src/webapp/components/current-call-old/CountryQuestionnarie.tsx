import React from "react";
import { Table, TableBody, TableHead, TableRow } from "@material-ui/core";
import styled from "styled-components";
import VisibilityIcon from "@material-ui/icons/Visibility";
import StarIcon from "@material-ui/icons/Star";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import { SideTitle, StyledHeadTableCell, StyledTableCell, StyledTableContainer } from "./common";
import i18n from "../../../locales";

export const CountryQuestionnarie: React.FC = () => {
    return (
        <ContentContainer>
            <SideTitleContainer>
                <SideTitle variant="h4">{i18n.t("Country questionnaire")}</SideTitle>
            </SideTitleContainer>

            <StyledTableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <StyledHeadTableCell>{i18n.t("Date")}</StyledHeadTableCell>
                            <StyledHeadTableCell>{i18n.t("Details")}</StyledHeadTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <StyledTableCell> 10/10/2020</StyledTableCell>
                            <StyledTableCell>
                                <VisibilityIcon htmlColor={glassColors.grey} fontSize="large" />
                            </StyledTableCell>
                        </TableRow>
                        <TableRow>
                            <StyledTableCell>10/10/2020</StyledTableCell>
                            <StyledTableCell>
                                <StarIcon htmlColor={glassColors.grey} fontSize="large" />
                            </StyledTableCell>
                        </TableRow>
                        <TableRow>
                            <StyledTableCell>10/10/2020</StyledTableCell>
                            <StyledTableCell>
                                <StarIcon htmlColor={glassColors.grey} fontSize="large" />
                            </StyledTableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </StyledTableContainer>
        </ContentContainer>
    );
};

const ContentContainer = styled.div`
    padding: 40px 60px;
`;

const SideTitleContainer = styled.div`
    height: 60px;
    display: flex;
    flex-direction: column;
    justify-content: end;
    padding-bottom: 16px;
`;
