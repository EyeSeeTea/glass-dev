import React from "react";
import { Paper, Table, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import styled from "styled-components";
import { UploadsTableBody } from "./UploadsTableBody";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
export interface UploadsDataItemProps {
    id: number;
    uploaded_date: string;
    date_first: string;
    date_last: string;
    records: number;
    type: "ris" | "sample";
    batch_id: string;
    status: string;
}

export interface UploadsDataProps {
    title: string;
    items?: UploadsDataItemProps[];
}

export const UploadsTable: React.FC<UploadsDataProps> = ({ title, items }) => {
    return (
        <ContentWrapper>
            <Typography variant="h3">{title}</Typography>

            <TableContainer component={Paper}>
                <Table className={"blocking-table"} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>{i18n.t("Uploaded")}</TableCell>
                            <TableCell>{i18n.t("Date First")}</TableCell>
                            <TableCell>{i18n.t("Date Last")}</TableCell>
                            <TableCell>{i18n.t("Records")}</TableCell>
                            <TableCell>{i18n.t("Type")}</TableCell>
                            <TableCell>{i18n.t("Batch ID")}</TableCell>
                            <TableCell>{i18n.t("Status")}</TableCell>
                        </TableRow>
                    </TableHead>

                    <UploadsTableBody rows={items} />
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
    .MuiTableRow-head {
        border-bottom: 3px solid ${glassColors.greyLight};
        th {
            color: ${glassColors.grey};
            font-weight: 400;
            font-size: 15px;
        }
    }
    .MuiTableBody-root {
        tr {
            border: none;
            td {
                border-bottom: 1px solid ${glassColors.greyLight};
            }
            td:nth-child(1) {
                color: ${glassColors.red};
            }
            td:nth-child(3) {
                width: 40px;
                text-align: center;
                opacity: 0.4;
                &:hover {
                    opacity: 1;
                }
            }
        }
    }
`;
