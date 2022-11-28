import React from "react";
import { Box, Button, Icon, Table, TableBody, TableHead, TableRow, Typography } from "@material-ui/core";
import styled from "styled-components";
import VisibilityIcon from "@material-ui/icons/Visibility";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import { SideTitle, StyledHeadTableCell, StyledTableCell, StyledTableContainer } from "./common";
import i18n from "../../../locales";

export const BaseDataFiles: React.FC = () => {
    return (
        <ContentContainer>
            <Box display="flex" flexDirection="row" justifyContent={"space-between"} alignItems="center">
                <Box display="flex" flexDirection={"column"} justifyContent={"center"}>
                    <SideTitle variant="h4">{i18n.t("Base data files")}</SideTitle>
                    <SideSubtitle>{i18n.t("Sample and RIS files")}</SideSubtitle>
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    endIcon={<Icon>add</Icon>}
                    style={{ padding: "10px 30px", fontSize: 20 }}
                >
                    {i18n.t("UPLOAD NEW")}
                </Button>
            </Box>
            <StyledTableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <StyledHeadTableCell variant="head">{i18n.t("Date")}</StyledHeadTableCell>
                            <StyledHeadTableCell variant="head">{i18n.t("status")}</StyledHeadTableCell>
                            <StyledHeadTableCell variant="head">{i18n.t("Details")}</StyledHeadTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <StyledTableCell> 10/10/2020</StyledTableCell>
                            <StyledTableCell style={{ color: glassColors.positive }}>Approved</StyledTableCell>
                            <StyledTableCell>
                                <VisibilityIcon htmlColor={glassColors.grey} fontSize="large" />
                            </StyledTableCell>
                        </TableRow>
                        <TableRow>
                            <StyledTableCell>10/10/2020</StyledTableCell>
                            <StyledTableCell style={{ color: glassColors.positive }}>Approved</StyledTableCell>
                            <StyledTableCell>
                                <VisibilityIcon htmlColor={glassColors.grey} fontSize="large" />
                            </StyledTableCell>
                        </TableRow>
                        <TableRow>
                            <StyledTableCell>10/10/2020</StyledTableCell>
                            <StyledTableCell style={{ color: glassColors.positive }}>Approved</StyledTableCell>
                            <StyledTableCell>
                                <VisibilityIcon htmlColor={glassColors.grey} fontSize="large" />
                            </StyledTableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </StyledTableContainer>
            <Box height={20} />
            <StyledTableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <StyledHeadTableCell colSpan={3}>
                                <KeyboardArrowDownIcon
                                    htmlColor={glassColors.grey}
                                    fontSize="large"
                                    style={{ verticalAlign: "middle", marginRight: 8 }}
                                />
                                {i18n.t("DaDeleted / Incompletedte")}
                            </StyledHeadTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <StyledTableCell> 10/10/2020 RIS</StyledTableCell>
                            <StyledTableCell style={{ color: glassColors.negative }}>Deleted By user</StyledTableCell>
                            <StyledTableCell>
                                <VisibilityIcon htmlColor={glassColors.grey} fontSize="large" />
                            </StyledTableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </StyledTableContainer>
        </ContentContainer>
    );
};

const SideSubtitle = styled(Typography)`
    font-size: 18px;
    color: ${glassColors.grey};
`;

const ContentContainer = styled.div`
    padding: 40px;
`;
