import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { NewSignalForm } from "../../components/new-signal/NewSignalForm";
import { useAppContext } from "../../contexts/app-context";
import { useSnackbar } from "@eyeseetea/d2-ui-components";

export const SignalPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { compositionRoot } = useAppContext();
    const snackbar = useSnackbar();

    useEffect(() => {
        if (id)
            return compositionRoot.signals.getSignal(id).run(
                signalEvent => {
                    console.debug(signalEvent);
                },
                err => {
                    snackbar.error(err);
                }
            );
    });

    return (
        <ContentWrapper>
            <NewSignalForm />
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;
