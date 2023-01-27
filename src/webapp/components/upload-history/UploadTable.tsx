import React from "react";
import { Box, Paper, Table, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import styled from "styled-components";
import { UploadTableBody } from "./UploadTableBody";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import ArrowUpwardIcon from "@material-ui/icons/ArrowUpward";
export interface UploadHistoryItemProps {
    id: string;
    batchId: string;
    countryCode: string;
    fileType: string;
    fileId: string;
    fileName: string;
    inputLineNb: number;
    outputLineNb: number;
    period: string;
    specimens: string[];
    status: string;
    submissionDate: Date;
    dataSubmission: string;
    module: string;
}

export interface UploadTableProps {
    title?: string;
    items?: UploadHistoryItemProps[];
    className?: string;
}

export const UploadTable: React.FC<UploadTableProps> = ({ title, items, className }) => {
    return (
        <ContentWrapper className={className}>
            {title && <Typography variant="h3">{title}</Typography>}

            <TableContainer component={Paper}>
                <Table className={"blocking-table"} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>{i18n.t("")}</TableCell>
                            <TableCell>
                                <StyledBox>
                                    <Typography variant="caption">{i18n.t("File Type")}</Typography>
                                    <ColStatus>
                                        <ArrowUpwardIcon />
                                        <sup>1</sup>
                                    </ColStatus>
                                </StyledBox>
                            </TableCell>
                            <TableCell>
                                <StyledBox>
                                    <Typography variant="caption">{i18n.t("Country")}</Typography>
                                    <ColStatus>
                                        <ArrowUpwardIcon />
                                        <sup>1</sup>
                                    </ColStatus>
                                </StyledBox>
                            </TableCell>
                            <TableCell>
                                <StyledBox>
                                    <Typography variant="caption">{i18n.t("Batch Id")}</Typography>
                                    <ColStatus>
                                        <ArrowUpwardIcon />
                                        <sup>1</sup>
                                    </ColStatus>
                                </StyledBox>
                            </TableCell>
                            <TableCell>
                                <StyledBox>
                                    <Typography variant="caption">{i18n.t("Period")}</Typography>
                                    <ColStatus>
                                        <ArrowUpwardIcon />
                                        <sup>1</sup>
                                    </ColStatus>
                                </StyledBox>
                            </TableCell>
                            <TableCell>
                                <StyledBox>
                                    <Typography variant="caption">{i18n.t("Specimens")}</Typography>
                                    <ColStatus>
                                        <ArrowUpwardIcon />
                                        <sup>1</sup>
                                    </ColStatus>
                                </StyledBox>
                            </TableCell>
                            <TableCell>
                                <StyledBox>
                                    <Typography variant="caption">{i18n.t("Status")}</Typography>
                                    <ColStatus>
                                        <ArrowUpwardIcon />
                                        <sup>1</sup>
                                    </ColStatus>
                                </StyledBox>
                            </TableCell>
                            <TableCell>
                                <StyledBox>
                                    <Typography variant="caption">{i18n.t("Date")}</Typography>
                                    <ColStatus>
                                        <ArrowUpwardIcon />
                                        <sup>1</sup>
                                    </ColStatus>
                                </StyledBox>
                            </TableCell>
                            <TableCell>
                                <StyledBox>
                                    <Typography variant="caption">{i18n.t("Filename")}</Typography>
                                    <ColStatus>
                                        <ArrowUpwardIcon />
                                        <sup>1</sup>
                                    </ColStatus>
                                </StyledBox>
                            </TableCell>
                            <TableCell>{i18n.t("")}</TableCell>
                            <TableCell>
                                <StyledBox>
                                    <Typography variant="caption">{i18n.t("Input Line Nb")}</Typography>
                                    <ColStatus>
                                        <ArrowUpwardIcon />
                                        <sup>1</sup>
                                    </ColStatus>
                                </StyledBox>
                            </TableCell>
                            <TableCell>
                                <StyledBox>
                                    <Typography variant="caption">{i18n.t("Output Line Nb")}</Typography>
                                    <ColStatus>
                                        <ArrowUpwardIcon />
                                        <sup>1</sup>
                                    </ColStatus>
                                </StyledBox>
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <UploadTableBody rows={items} />
                </Table>
            </TableContainer>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    h3 {
        font-size: 22px;
        color: ${palette.text.primary};
        font-weight: 500;
    }
    .MuiTableContainer-root {
        border: none;
        box-shadow: none;
    }
    thead {
        border-bottom: 3px solid ${glassColors.greyLight};
        th {
            color: ${glassColors.grey};
            font-weight: 400;
            font-size: 15px;
            padding: 10px 15px;
            vertical-align: bottom;
            position: relative;
            &:after {
                content: "";
                height: 25px;
                border-right: 2px solid ${glassColors.greyLight};
                position: absolute;
                right: 0;
                top: 50px;
            }
        }
    }
    tbody {
        tr {
            border: none;
            &:hover {
                background-color: ${glassColors.greyLight};
                cursor: pointer;
            }
            td {
                border-bottom: 1px solid ${glassColors.greyLight};
            }
        }
    }
    &.error-group {
        tbody {
            td:nth-child(7) {
                color: ${glassColors.red};
                opacity: 1;
            }
        }
    }
`;

const ColStatus = styled.div`
    display: inline-flex;
    margin-left: 10px;
    svg {
        color: ${glassColors.greyBlack};
        font-size: 18px;
        margin-top: auto;
    }
    span {
    }
`;

const StyledBox = styled(Box)`
    display: flex;
    flex-direction: column;
    text-align: center;
    align-items: center;
`;
