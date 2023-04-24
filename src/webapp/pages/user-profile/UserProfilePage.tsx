import React from "react";
import styled from "styled-components";
import { useAppContext } from "../../contexts/app-context";
import { UserProfileContent } from "../../components/user-profile/UserProfileContent";

export const UserProfilePage: React.FC = React.memo(() => {
    const { currentUser } = useAppContext();

    return (
        <ContentWrapper>
            <UserProfileContent userInformation={currentUser} />
        </ContentWrapper>
    );
});

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;
