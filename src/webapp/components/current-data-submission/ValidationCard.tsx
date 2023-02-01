import React from "react";
import styled from "styled-components";
import { CustomCard } from "../custom-card/CustomCard";
export interface QuetionnairesGridItem {
    id: number;
    uploaded_date: string;
    date_first: string;
    date_last: string;
    records: number;
    type: "ris" | "sample";
    batch_id: string;
    status: string;
}

export interface QuetionnairesGridProps {
    items?: QuetionnairesGridItem[];
    className?: string;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const QuetionnairesGrid: React.FC<QuetionnairesGridProps> = ({ items, className }) => {
    return (
        <ContentWrapper className={className}>
            <CustomCard />
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
