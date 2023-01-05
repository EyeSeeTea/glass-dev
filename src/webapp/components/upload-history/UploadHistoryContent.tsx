import styled from "styled-components";
import { UploadTable } from "./UploadTable";
import { useLocation } from "react-router-dom";
import { data } from "./mock-tables-data.json";
import { Filter } from "./Filter";
import { CustomCard } from "../custom-card/CustomCard";

export const UploadHistoryContent: React.FC = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);

    return (
        <ContentWrapper>
            <Filter />
            <CustomCard padding="20px 30px 20px">
                <UploadTable items={data} data-current-module={params.get("userId")} />
            </CustomCard>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 40px;
    p.intro {
        text-align: left;
        max-width: 730px;
        margin: 0 auto;
        font-weight: 300px;
        line-height: 1.4;
    }
`;
