import styled from "styled-components";
import { DataSubmissionsTable } from "./DataSubmissionsTable";
import { useLocation } from "react-router-dom";
import { data } from "./mock-tables-data.json";

export const DataSubmissionsHistoryContent: React.FC = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);

    return (
        <ContentWrapper>
            <DataSubmissionsTable items={data} data-current-module={params.get("userId")} />
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
