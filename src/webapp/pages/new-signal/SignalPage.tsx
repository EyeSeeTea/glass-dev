import React from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { NewSignalForm } from "../../components/new-signal/NewSignalForm";

export const SignalPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    return (
        <ContentWrapper>
            <NewSignalForm readonly={true} eventId={id} />
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;
