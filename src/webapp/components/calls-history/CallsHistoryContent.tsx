import styled from "styled-components";
import { CallsTable } from "./CallsTable";
import { useLocation } from "react-router-dom";

// TODO: replace mock date with actual use case for fetch calls history from back-end
import { data } from "./mock-tables-data.json";

export const CallsHistoryContent: React.FC = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);

    return (
        <ContentWrapper>
            <CallsTable items={data} data-current-module={params.get("userId")} />
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
