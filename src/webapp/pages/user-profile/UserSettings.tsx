import React from "react";
import styled from "styled-components";
import { useAppContext } from "../../contexts/app-context";
import { UserSettingsContent } from "../../components/user-profile/UserSettingsContent";

export const UserSettingsPage: React.FC = React.memo(() => {
    const { currentUser } = useAppContext();

    return (
        <ContentWrapper>
            <UserSettingsContent userInformation={currentUser} />
        </ContentWrapper>
    );
});

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;
