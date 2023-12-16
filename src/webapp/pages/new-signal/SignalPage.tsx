import React, { useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { EAR_PROGRAM_ID } from "../../../domain/usecases/GetProgramQuestionnaireUseCase";
import { ProgramQuestionnaireForm } from "../../components/new-signal/ProgramQuestionnaireForm";

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
            <ProgramQuestionnaireForm
                readonly={readOnly}
                signalId={signalId}
                eventId={signalEvtId}
                hideForm={hideForm}
                questionnaireId={EAR_PROGRAM_ID}
                hidePublish={false}
            />
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;
