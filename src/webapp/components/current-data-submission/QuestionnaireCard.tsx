import React from "react";
import styled from "styled-components";
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
    console.debug("items: ", items);

    return (
        <ContentWrapper className={className}>
            <CustomCard />
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div``;
