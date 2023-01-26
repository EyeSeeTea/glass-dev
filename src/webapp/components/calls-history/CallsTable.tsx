import React from "react";
import { Paper, Table, TableCell, TableContainer, TableHead, TableRow } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { glassColors } from "../../pages/app/themes/dhis2.theme";
import ArrowUpwardIcon from "@material-ui/icons/ArrowUpward";
import { useHistory } from "react-router-dom";
import { StatusCapsule } from "./StatusCapsule";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { TableBody } from "material-ui";
import { GlassCall } from "../../../domain/entities/GlassCallStatus";

export interface CallsTableProps {
    items?: GlassCall[];
    moduleName: string;
    orgUnit: string;
}

export const CallsTable: React.FC<CallsTableProps> = ({ items, moduleName, orgUnit }) => {
    const history = useHistory();

    const handleClick = (period: number) => {
        history.push(`/current-call/${moduleName}?period=${period}&orgUnit=${orgUnit}`);
    };
    return (
        <ContentWrapper>
            <TableContainer component={Paper}>
                <Table aria-label="Call history table">
                    <StyledTableHead>
                        <TableRow>
                            <TableCell>
                                {i18n.t("Year")}
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
                    </StyledTableHead>

                    {items && items.length ? (
                        <StyledTableBody displayRowCheckbox={false}>
                            {items.map((row: GlassCall) => (
                                <TableRow key={row.id} onClick={() => handleClick(row.period)}>
                                    <TableCell>{row.period}</TableCell>
                                    <TableCell>
                                        <StatusCapsule status={row.status} />
                                    </TableCell>
                                    <StyledCTACell className="cta">
                                        <ChevronRightIcon />
                                    </StyledCTACell>
                                </TableRow>
                            ))}
                        </StyledTableBody>
                    ) : (
                        <p>No data found...</p>
                    )}
                </Table>
            </TableContainer>
        </ContentWrapper>
    );
};
const ContentWrapper = styled.div`
    .MuiTableContainer-root {
        border: none;
        box-shadow: none;
    }
`;
const StyledTableHead = styled(TableHead)`
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
`;

const StyledTableBody = styled(TableBody)`
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
`;

const ColStatus = styled.div`
    display: inline-flex;
    margin-left: 10px;
    svg {
        color: ${glassColors.greyBlack};
        font-size: 18px;
        margin-top: auto;
    }
`;

const StyledCTACell = styled(TableCell)`
     {
        text-align: center;
        svg {
            color: ${glassColors.grey};
        }
        &:hover {
            svg {
                color: ${glassColors.greyBlack};
            }
        }
    }
`;
