import React from "react";
import { Paper, Table, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import styled from "styled-components";
import { CallsTableBody } from "./CallsTableBody";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import ArrowUpwardIcon from "@material-ui/icons/ArrowUpward";
export interface CallsHistoryItemProps {
    id: number;
    year: string | number;
    open_status: string;
    status: string;
}

export interface CallsTableProps {
    title?: string;
    items?: CallsHistoryItemProps[];
    className?: string;
}

// TODO: replace Table with Datagrid
export const CallsTable: React.FC<CallsTableProps> = ({ title, items, className }) => {
    return (
        <ContentWrapper className={className}>
            {title && <Typography variant="h3">{title}</Typography>}

            <TableContainer component={Paper}>
                <Table className={"blocking-table"} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                {i18n.t("Year")}
                                <ColStatus>
                                    <ArrowUpwardIcon />
                                    <sup>1</sup>
                                </ColStatus>
                            </TableCell>
                            <TableCell>
                                {i18n.t("Open / Close")}
                                <ColStatus>
                                    <ArrowUpwardIcon />
                                    <sup>1</sup>
                                </ColStatus>
                            </TableCell>
                            <TableCell>
                                {i18n.t("Status")}
                                <ColStatus>
                                    <ArrowUpwardIcon />
                                    <sup>1</sup>
                                </ColStatus>
                            </TableCell>
                            <TableCell>{i18n.t(" ")}</TableCell>
                        </TableRow>
                    </TableHead>

                    <CallsTableBody rows={items} />
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
                height: 15px;
                border-right: 2px solid ${glassColors.greyLight};
                position: absolute;
                right: 0;
                top: 20px;
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
