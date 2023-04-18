import React, { useState } from "react";
import { Paper, Table, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import styled from "styled-components";
import { DataFileTableBody } from "./DataFileTableBody";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import { ArrowUpward, ArrowDownward } from "@material-ui/icons";
export interface DataFileHistoryItemProps {
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
    uploadDate: string;
    dataSubmission: string;
    module: string;
    records: number;
}
export type SortDirection = "asc" | "desc";
export interface DataFileTableProps {
    title?: string;
    items?: DataFileHistoryItemProps[];
    className?: string;
    sortByColumn: (columnName: string, sortDirection: SortDirection) => void;
}

export const DataFileTable: React.FC<DataFileTableProps> = ({ title, items, className, sortByColumn }) => {
    const [fileTypeSortDirection, setFileTypeSortDirection] = useState<SortDirection>("asc");
    const [batchIdSortDirection, setBatchIdSortDirection] = useState<SortDirection>("asc");
    const [dateSortDirection, setDateSortDirection] = useState<SortDirection>("asc");
    const [fileNameSortDirection, setFileNameSortDirection] = useState<SortDirection>("asc");
    const [recordsSortDirection, setRecordsSortDirection] = useState<SortDirection>("asc");

    return (
        <ContentWrapper className={className}>
            {title && <Typography variant="h3">{title}</Typography>}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell
                                onClick={() => {
                                    fileTypeSortDirection === "asc"
                                        ? setFileTypeSortDirection("desc")
                                        : setFileTypeSortDirection("asc");
                                    sortByColumn("fileType", fileTypeSortDirection);
                                }}
                            >
                                <span>
                                    <Typography variant="caption">{i18n.t("File Type")}</Typography>
                                    {fileTypeSortDirection === "asc" ? (
                                        <ArrowUpward fontSize="small" />
                                    ) : (
                                        <ArrowDownward fontSize="small" />
                                    )}
                                </span>
                            </TableCell>
                            <TableCell>
                                <Typography variant="caption">{i18n.t("Country")}</Typography>
                            </TableCell>
                            <TableCell
                                onClick={() => {
                                    batchIdSortDirection === "asc"
                                        ? setBatchIdSortDirection("desc")
                                        : setBatchIdSortDirection("asc");
                                    sortByColumn("batchId", batchIdSortDirection);
                                }}
                            >
                                <span>
                                    <Typography variant="caption">{i18n.t("Batch Id")}</Typography>
                                    {batchIdSortDirection === "asc" ? (
                                        <ArrowUpward fontSize="small" />
                                    ) : (
                                        <ArrowDownward fontSize="small" />
                                    )}
                                </span>
                            </TableCell>
                            <TableCell>
                                <Typography variant="caption">{i18n.t("Period")}</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="caption">{i18n.t("Specimens")}</Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="caption">{i18n.t("Status")}</Typography>
                            </TableCell>
                            <TableCell
                                onClick={() => {
                                    dateSortDirection === "asc"
                                        ? setDateSortDirection("desc")
                                        : setDateSortDirection("asc");
                                    sortByColumn("uploadDate", dateSortDirection);
                                }}
                            >
                                <span>
                                    <Typography variant="caption">{i18n.t("Date")}</Typography>
                                    {dateSortDirection === "asc" ? (
                                        <ArrowUpward fontSize="small" />
                                    ) : (
                                        <ArrowDownward fontSize="small" />
                                    )}
                                </span>
                            </TableCell>
                            <TableCell
                                onClick={() => {
                                    fileNameSortDirection === "asc"
                                        ? setFileNameSortDirection("desc")
                                        : setFileNameSortDirection("asc");
                                    sortByColumn("fileName", fileNameSortDirection);
                                }}
                            >
                                <span>
                                    <Typography variant="caption">{i18n.t("Filename")}</Typography>
                                    {fileNameSortDirection === "asc" ? (
                                        <ArrowUpward fontSize="small" />
                                    ) : (
                                        <ArrowDownward fontSize="small" />
                                    )}
                                </span>
                            </TableCell>

                            <TableCell>
                                <Typography variant="caption">{i18n.t("Download")}</Typography>
                            </TableCell>

                            <TableCell
                                onClick={() => {
                                    recordsSortDirection === "asc"
                                        ? setRecordsSortDirection("desc")
                                        : setRecordsSortDirection("asc");
                                    sortByColumn("records", recordsSortDirection);
                                }}
                            >
                                <span>
                                    <Typography variant="caption">{i18n.t("Records")}</Typography>
                                    {recordsSortDirection === "asc" ? (
                                        <ArrowUpward fontSize="small" />
                                    ) : (
                                        <ArrowDownward fontSize="small" />
                                    )}
                                </span>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <DataFileTableBody rows={items} />
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

            vertical-align: bottom;
            position: relative;
            &:after {
                content: "";
                height: 25px;
                border-right: 2px solid ${glassColors.greyLight};
                position: absolute;
                right: 0;
                top: 30px;
            }
        }
    }
    tbody {
        tr {
            border: none;
            &:hover {
                background-color: ${glassColors.greyLight};
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
