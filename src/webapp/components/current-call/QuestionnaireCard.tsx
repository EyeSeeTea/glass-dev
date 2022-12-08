import React from "react";
import { Paper, Table, TableCell, TableContainer, TableHead, TableRow, Typography } from "@material-ui/core";
import styled from "styled-components";
import { UploadsTableBody } from "./UploadsTableBody";
import i18n from "@eyeseetea/d2-ui-components/locales";
import { glassColors, palette } from "../../pages/app/themes/dhis2.theme";
import { CustomCard } from "../custom-card/CustomCard";
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
    items?: UploadsDataItemProps[];
    className?: string;
}

export const QuetionnaireCard: React.FC<UploadsDataProps> = ({ items, className }) => {
    return (
        <ContentWrapper className={className}>
            <CustomCard />
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
