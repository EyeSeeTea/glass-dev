import React, { useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { NewSignalForm } from "../../components/new-signal/NewSignalForm";

export const SignalPage: React.FC = () => {
    const { state } = useLocation<{ readOnly: boolean; signalId: string; signalEvtId: string }>();
    const [readOnly, setReadyOnly] = React.useState(false);
    const [signalId, setSignalId] = React.useState("");
    const [signalEvtId, setSignalEvtId] = React.useState("");
    const history = useHistory();

    useEffect(() => {
        if (state?.readOnly) setReadyOnly(state.readOnly);
        if (state?.signalEvtId) setSignalEvtId(state.signalEvtId);
        if (state?.signalId) setSignalId(state.signalId);
    }, [state]);

    const hideForm = () => {
        history.push(`/signals`);
    };

    return (
        <ContentWrapper>
            <NewSignalForm readonly={readOnly} signalId={signalId} signalEventId={signalEvtId} hideForm={hideForm} />
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;
