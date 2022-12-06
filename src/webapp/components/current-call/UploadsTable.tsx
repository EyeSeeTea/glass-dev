import React from "react";
import { Paper, Table, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import styled from "styled-components";
import { UploadsTableBody } from "./UploadsTableBody";
import i18n from "@eyeseetea/d2-ui-components/locales";

export interface UploadsDataItemProps {
    id: number;
    uploaded_date: string;
    date_first: string;
    date_last: string;
    records: number;
    type: "ris" | "sample";
    batch_id: "Dataset 1" | "Dataset 2";
    status: "replaced" | "uploaded" | "error";
}

export interface UploadsDataProps {
    title: string;
    items?: UploadsDataItemProps[];
}

export const UploadsTable: React.FC<UploadsDataProps> = ({
    title, 
    items }) => {
    
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

const ContentWrapper = styled.div``;
