import React from "react";
import { Button } from "@material-ui/core";
import styled from "styled-components";
import i18n from "@eyeseetea/d2-ui-components/locales";


export interface CtaButtonsProps {
    changeScreen: (val: string) => void;
}

export const CtaButtons: React.FC<CtaButtonsProps> = ({changeScreen}) => {

    return (
        <ContentWrapper>
            <Button variant="contained" color="primary" 
                onClick={() => changeScreen('upload')}
                >
                {i18n.t("Upload dataset")}
            </Button>
            <Button variant="contained" color="primary">
                {i18n.t("Go to Questionnaires")}
            </Button>
        </ContentWrapper>
    );
};

const ContentWrapper = styled.div`
    display: flex;
    margin: 40px auto 0;
    justify-content: center;
    gap: 10%;
    > div {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
    button {
        padding: 6px 16px;
    }
`;
