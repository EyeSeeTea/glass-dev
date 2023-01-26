import styled from "styled-components";
import { UploadTable } from "./UploadTable";
import { useLocation } from "react-router-dom";
import { useAppContext } from "../../contexts/app-context";
import { useGlassSubmissions } from "../../hooks/useGlassSubmissions";
import { Filter } from "./Filter";
import { CustomCard } from "../custom-card/CustomCard";
import { CircularProgress, Typography } from "@material-ui/core";

export const UploadHistoryContent: React.FC = () => {
    const location = useLocation();
    const { compositionRoot } = useAppContext();
    const submissions = useGlassSubmissions(compositionRoot);
    const params = new URLSearchParams(location.search);

    switch (submissions.kind) {
        case "loading":
            return <CircularProgress />;
        case "error":
            return <Typography variant="h6">{submissions.message}</Typography>;
        case "loaded":
            return (
                <ContentWrapper>
                    <Filter />
                    <CustomCard padding="20px 30px 20px">
                        <UploadTable items={submissions.data} data-current-module={params.get("userId")} />
                    </CustomCard>
                </ContentWrapper>
            );
    }
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
